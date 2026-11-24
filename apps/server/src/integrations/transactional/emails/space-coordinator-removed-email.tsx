import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { content, paragraph } from '../css/styles';
import { MailBody } from '../partials/partials';

interface Props {
  spaceName: string;
}

export const SpaceCoordinatorRemovedEmail = ({ spaceName }: Props) => {
  return (
    <MailBody>
      <Section style={content}>
        <Text style={paragraph}>Hi there,</Text>
        <Text style={paragraph}>
          You are no longer the coordinator of the space{' '}
          <strong>{spaceName}</strong>.
        </Text>
      </Section>
    </MailBody>
  );
};

export default SpaceCoordinatorRemovedEmail;
