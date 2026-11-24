import { Section, Text, Button } from '@react-email/components';
import * as React from 'react';
import { button, content, paragraph } from '../css/styles';
import { MailBody } from '../partials/partials';

interface Props {
  spaceName: string;
  spaceUrl: string;
}

export const SpaceCoordinatorAssignedEmail = ({
  spaceName,
  spaceUrl,
}: Props) => {
  return (
    <MailBody>
      <Section style={content}>
        <Text style={paragraph}>Hi there,</Text>
        <Text style={paragraph}>
          You have been assigned as the coordinator of the space{' '}
          <strong>{spaceName}</strong>. You now have full access to it.
        </Text>
      </Section>
      <Section
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: '15px',
          paddingBottom: '15px',
        }}
      >
        <Button href={spaceUrl} style={button}>
          Open space
        </Button>
      </Section>
    </MailBody>
  );
};

export default SpaceCoordinatorAssignedEmail;
