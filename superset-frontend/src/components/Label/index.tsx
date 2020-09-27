/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { CSSProperties } from 'react';
import { Label as BootstrapLabel } from 'react-bootstrap';
import { styled } from '@superset-ui/core';
import cx from 'classnames';

export type OnClickHandler = React.MouseEventHandler<BootstrapLabel>;

export interface LabelProps {
  key?: string;
  className?: string;
  id?: string;
  tooltip?: string;
  placement?: string;
  onClick?: OnClickHandler;
  bsStyle?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

const SupersetLabel = styled(BootstrapLabel)`
  /* un-bunch them! */
  margin-right: ${({ theme }) => theme.gridUnit}px;
  &:first-of-type {
    margin-left: 0;
  }
  &:last-of-type {
    margin-right: 0;
  }
  border-width: 1px;
  border-style: solid;
  cursor: ${({ onClick }) => (onClick ? 'pointer' : 'default')};
  box-shadow: ${({ onClick }) => (onClick ? '1px 1px 2px 1px #EEE' : 'none')};
  &:hover {
    box-shadow: ${({ onClick }) => (onClick ? '1px 1px 3px 2px #CCC' : 'none')};
  }

  transition: background-color ${({ theme }) => theme.transitionTiming}s;
  &.label-warning {
    background-color: ${({ theme }) => theme.colors.alert.light2};
    color: ${({ theme }) => theme.colors.alert.dark2};
    border-color: ${({ theme }) => theme.colors.alert.base};
    &:hover {
      background-color: ${({ theme, onClick }) =>
        onClick ? 'transparent' : theme.colors.alert.light2};
    }
  }
  &.label-danger {
    background-color: ${({ theme }) => theme.colors.error.light2};
    color: ${({ theme }) => theme.colors.error.dark1};
    border-color: ${({ theme }) => theme.colors.error.light1};
    &:hover {
      background-color: ${({ theme, onClick }) =>
        onClick ? 'transparent' : theme.colors.error.light2};
    }
  }
  &.label-success {
    background-color: ${({ theme }) => theme.colors.success.light2};
    color: ${({ theme }) => theme.colors.success.dark1};
    border-color: ${({ theme }) => theme.colors.success.base};
    &:hover {
      background-color: ${({ theme, onClick }) =>
        onClick ? 'transparent' : theme.colors.success.light2};
    }
  }
  &.label-default {
    background-color: ${({ theme }) => theme.colors.grayscale.light3};
    color: ${({ theme }) => theme.colors.grayscale.dark1};
    border-color: ${({ theme }) => theme.colors.grayscale.light1};
    &:hover {
      background-color: ${({ theme, onClick }) =>
        onClick ? 'transparent' : theme.colors.grayscale.light3};
    }
  }
  &.label-info {
    background-color: ${({ theme }) => theme.colors.info.light2};
    color: ${({ theme }) => theme.colors.info.dark1};
    border-color: ${({ theme }) => theme.colors.info.base};
    &:hover {
      background-color: ${({ theme, onClick }) =>
        onClick ? 'transparent' : theme.colors.info.light2};
    }
  }
  &.label-primary {
    background-color: ${({ theme }) => theme.colors.primary.light3};
    color: ${({ theme }) => theme.colors.primary.dark1};
    border-color: ${({ theme }) => theme.colors.primary.light1};
    &:hover {
      background-color: ${({ theme, onClick }) =>
        onClick ? 'transparent' : theme.colors.primary.light3};
    }
  }
  /* note this is NOT a supported bootstrap label Style... this overrides default */
  &.label-secondary {
    background-color: ${({ theme }) => theme.colors.secondary.light3};
    color: ${({ theme }) => theme.colors.secondary.dark1};
    border-color: ${({ theme }) => theme.colors.secondary.light1};
    &:hover {
      background-color: ${({ theme, onClick }) =>
        onClick ? 'transparent' : theme.colors.secondary.light3};
    }
  }
`;

export default function Label(props: LabelProps) {
  const officialBootstrapStyles = [
    'success',
    'warning',
    'danger',
    'info',
    'default',
    'primary',
  ];
  const labelProps = {
    ...props,
    placement: props.placement || 'top',
    bsStyle: officialBootstrapStyles.includes(props.bsStyle || '')
      ? props.bsStyle
      : 'default',
    className: cx(props.className, {
      [`label-${props.bsStyle}`]: !officialBootstrapStyles.includes(
        props.bsStyle || '',
      ),
    }),
  };
  return <SupersetLabel {...labelProps}>{props.children}</SupersetLabel>;
}
