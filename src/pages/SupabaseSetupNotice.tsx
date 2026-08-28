import { Card, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export function SupabaseSetupNotice() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F5F1',
        padding: 24,
      }}
    >
      <Card style={{ maxWidth: 520 }}>
        <Title level={4} style={{ marginTop: 0 }}>
          Configuration Supabase requise
        </Title>
        <Paragraph>
          Le projet SIM est initialisé, mais aucun projet Supabase n'est encore connecté.
        </Paragraph>
        <Paragraph>
          Copiez <Text code>.env.example</Text> vers <Text code>.env</Text>, puis renseignez :
        </Paragraph>
        <ul>
          <li>
            <Text code>VITE_SUPABASE_URL</Text>
          </li>
          <li>
            <Text code>VITE_SUPABASE_ANON_KEY</Text>
          </li>
        </ul>
        <Paragraph type="secondary">
          Ces valeurs se trouvent dans Project Settings → API sur votre projet Supabase.
          Relancez ensuite <Text code>npm run dev</Text>.
        </Paragraph>
      </Card>
    </div>
  );
}
