import { Paper, Title } from '@mantine/core';

export default function Settings() {

  return (
    <Paper shadow="sm" p="xl" radius="md" className="max-w-lg mx-auto mt-8">
      <Title order={3} mb="md">Account Settings</Title>
    </Paper>
  );
}
