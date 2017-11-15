#
# ELB config
# In this service template, no ELBs are orchestrated
# - service to service connections and routing is handled by envoy. Documentation: https://github.com/lyft/envoy/blob/master/docs/getting_started.md)
# - external (e.g. public-facing) requests into your service can also be enabled through envoy. Documentation: https://github.com/lyft/envoy/blob/master/docs/routing.md
#

include:
  - orca_base

{% include 'alarms.sls' %}

Ensure {{ grains.cluster_name }} security group exists:
  boto_secgroup.present:
    - name: {{ grains.cluster_name }}
    - description: {{ grains.cluster_name }}
    - region: us-east-1
    - rules:
      # allow multiredis traffic
      - ip_protocol: tcp
        from_port: 22120
        to_port: 22120
        source_group_name:
          - {{ grains.cluster_name }}
    - vpc_id: vpc-4ec8112b
    - profile: orca_profile

Ensure superset-{{ grains.service_instance }}-iad iam role exists:
  boto_iam_role.present:
    - name: superset-{{ grains.service_instance }}-iad
    - policies_from_pillars:
        - orca_iam_policies
    - profile: orca_profile
    - policies:
        's3-superset-{{ grains.service_instance }}-read-write':
          Version: '2012-10-17'  # do not modify
          Statement:
            - Action:
                - 's3:GetObject'
                - 's3:GetObjectVersion*'
                - 's3:ListBucket'
                - 's3:PutObject'
              Effect: 'Allow'
              Resource:
                - 'arn:aws:s3:::lyft-superset-{{ grains.service_instance }}-iad'
                - 'arn:aws:s3:::lyft-superset-{{ grains.service_instance }}-iad/*'
        'superset-sqs':
          Version: '2012-10-17'
          Statement:
            - Action:
                - 'sqs:SendMessage'
                - 'sqs:ReceiveMessage'
                - 'sqs:DeleteMessage'
                - 'sqs:GetQueueUrl'
                - 'sqs:GetQueueAttributes'
                - 'sqs:SetQueueAttributes'
                - 'sqs:ListQueues'
                - 'sqs:CreateQueue'
                - 'sqs:DeleteQueue'
              Effect: 'Allow'
              Resource:
                - 'arn:aws:sqs:*:*:superset-{{grains.service_instance}}-*'

Ensure {{ grains.cluster_name }} asg exists:
  boto_asg.present:
    - name: {{ grains.cluster_name }}
    - launch_config_name: {{ grains.cluster_name }}
    - launch_config:
      - image_id: {{ pillar.ec2_ami.iad.ubuntu14.hvm_ssd }}
      - key_name: boot
      - security_groups:
        - base
        - {{ grains.cluster_name }}
      # The instance profile name used here should match the instance profile
      # created above.
      - instance_profile_name: {{ grains.cluster_name }}
      - instance_type: c4.4xlarge
      {% if grains.service_instance == 'production' %}
      - instance_type: c4.4xlarge
      {% else %}
      - instance_type: c4.large
      {% endif %}
      - block_device_mappings:
        - "/dev/sda1":
            size: 40
            volume_type: gp2
            delete_on_termination: true
      - associate_public_ip_address: True
      - instance_monitoring: true
      - cloud_init:
          scripts:
            salt: |
              #!/bin/bash
              {{ pillar.cloud_init_bootstrap_script_base | indent(15,true) }}
    - vpc_zone_identifier: {{ pillar.vpc_subnets }}
    - availability_zones: {{ pillar.availability_zones }}
    {% if grains.service_instance == 'production' %}
    - min_size: 2
    - max_size: 2
    {% else %}
    - min_size: 2
    - max_size: 2
    {% endif %}
    - tags:
      - key: 'Name'
        value: '{{ grains.cluster_name }}'
        propagate_at_launch: true
      - key: 'service_repo_name'
        value: '{{ grains.service_name }}'
        propagate_at_launch: true
    - profile: orca_profile

{% if grains.service_instance == 'production' %}

Ensure {{ grains.cluster_name }}-canary asg exists:
  boto_asg.present:
    - name: {{ grains.cluster_name }}-canary
    - launch_config_name: {{ grains.cluster_name }}-canary
    - launch_config:
      - image_id: {{ pillar.ec2_ami.iad.ubuntu14.hvm_ssd }}
      - key_name: boot
      - security_groups:
        - base
      - instance_profile_name: {{ grains.cluster_name }}
      - instance_type: c4.large
      - block_device_mappings:
        - "/dev/sda1":
            size: 40
            volume_type: gp2
            delete_on_termination: true
      - associate_public_ip_address: True
      - instance_monitoring: true
      - cloud_init:
          scripts:
            salt: |
              #!/bin/bash
              {{ pillar.cloud_init_bootstrap_script_base | indent(15,true) }}
    - vpc_zone_identifier: {{ pillar.vpc_subnets }}
    - availability_zones: {{ pillar.availability_zones }}
    - min_size: 1
    - max_size: 1
    - tags:
      - key: 'Name'
        value: '{{ grains.cluster_name }}-canary'
        propagate_at_launch: true
      - key: 'service_repo_name'
        value: '{{ grains.service_name }}'
        propagate_at_launch: true
      - key: 'Canary'
        value: 'True'
        propagate_at_launch: true
    - profile: orca_profile
{% endif %}


Ensure lyft-superset-{{grains.service_instance}}-iad bucket exists:
  boto_s3_bucket.present:
    - Bucket: lyft-superset-{{grains.service_instance}}-iad
    - ACL:
        ACL: private
    - Versioning:
        Status: "Enabled"
    - region: us-east-1
    - Policy:
        Version: "2012-10-17"
        Statement:
          - Sid: "DenyIncorrectEncryptionHeader"
            Effect: "Deny"
            Principal:
              AWS: "*"
            Action:
              - "s3:PutObject"
            Resource:
              - "arn:aws:s3:::lyft-superset-{{grains.service_instance}}-iad/*"
            Condition:
              StringNotEquals:
                "s3:x-amz-server-side-encryption": "AES256"
          - Sid: "DenyUnEncryptedObjectUploads"
            Effect: "Deny"
            Principal:
              AWS: "*"
            Action:
              - "s3:PutObject"
            Resource:
              - "arn:aws:s3:::lyft-superset-{{grains.service_instance}}-iad/*"
            Condition:
              "Null":
                "s3:x-amz-server-side-encryption": "true"


Ensure {{ grains.service_name }}multiredis-{{ grains.service_instance }}-{{ grains.region }} asg exists:
  boto_asg.present:
    - name: {{ grains.service_name }}multiredis-{{ grains.service_instance }}-{{ grains.region }}
    - launch_config_name: {{ grains.service_name }}multiredis-{{ grains.service_instance }}-{{ grains.region }}
    - launch_config:
      - image_id: {{ pillar.ec2_ami.iad.ubuntu14.hvm_ssd }}
      - key_name: boot
      - security_groups:
        - base
        - {{ grains.cluster_name }}
      - instance_profile_name: multiredis-{{ grains.service_instance }}-{{ grains.region }}
      {% if grains.service_instance == 'production' %}
      - instance_type: c4.large
      {% else %}
      - instance_type: t2.medium
      {% endif %}
      - block_device_mappings:
        - "/dev/sda1":
            size: 40
            volume_type: gp2
            delete_on_termination: true
      - associate_public_ip_address: True
      - instance_monitoring: true
      - cloud_init:
          scripts:
            salt: |
              #!/bin/bash
              CLUSTER_NAME={{ grains.service_name }}multiredis-{{ grains.service_instance }}-{{ grains.region }}
              SERVICE_REPO_NAME=multiredis
              {{ pillar.cloud_init_bootstrap_script_base | indent(15,true) }}
    - vpc_zone_identifier: {{ pillar.vpc_subnets }}
    - availability_zones:
      - us-east-1a
      - us-east-1d
      - us-east-1e
    {% if grains.service_instance == 'production' %}
    - min_size: 1
    - max_size: 1
    - desired_capacity: 1
    {% else %}
    - min_size: 1
    - max_size: 1
    - desired_capacity: 1
    {% endif %}
    - tags:
      - key: 'Name'
        value: '{{ grains.service_name }}multiredis-{{ grains.service_instance }}-{{ grains.region }}'
        propagate_at_launch: true
    - profile: orca_profile
