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
    - vpc_name: production-iad
    - profile: orca_profile

Ensure {{ grains.cluster_name }} iam role exists:
  boto_iam_role.present:
    - name: {{ grains.cluster_name }}
    - policies_from_pillars:
        - orca_iam_policies
    - profile: orca_profile
    - policies:
        'superset-s3-read-write':
          Version: '2012-10-17'
          Statement:
            - Sid: 'SupersetServiceFullObjectPermissions'
              Action:
                - 's3:AbortMultipartUpload'
                - 's3:Get*'
                - 's3:Put*'
                - 's3:Delete*'
                - 's3:List*'
              Effect: 'Allow'
              Resource:
                - 'arn:aws:s3:::lyft-superset-{{grains.service_instance}}-iad'
                - 'arn:aws:s3:::lyft-superset-{{grains.service_instance}}-iad/*'
            - Sid: 'SupersetServiceListPermissions'
              Action:
                - 's3:List*'
              Effect: 'Allow'
              Resource:
                - 'arn:aws:s3:::lyft-superset-{{grains.service_instance}}-iad'
              Condition:
                - 's3:prefix':
                  - 'arn:aws:s3:::lyft-superset-{{grains.service_instance}}-iad'
                  - 'arn:aws:s3:::lyft-superset-{{grains.service_instance}}-iad/*'

Ensure {{ grains.cluster_name }} asg exists:
  boto_asg.present:
    - name: {{ grains.cluster_name }}
    - launch_config_name: {{ grains.cluster_name }}
    - launch_config:
      - image_id: {{ pillar.ec2_ami.iad.ubuntu14.hvm_ssd }}
      - key_name: boot
      - security_groups:
        - base
      # The instance profile name used here should match the instance profile
      # created above.
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
              SERVICE_ELBS="{{ grains.cluster_name }}-i"
              {{ pillar.cloud_init_bootstrap_script_base | indent(15,true) }}
    - vpc_zone_identifier: {{ pillar.vpc_subnets }}
    - availability_zones: {{ pillar.availability_zones }}
    {% if grains.service_instance == 'production' %}
    - min_size: {{ pillar.availability_zones|length }}
    - max_size: {{ pillar.availability_zones|length }}
    {% else %}
    - min_size: 1
    - max_size: 1
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
