import { Result } from 'antd';

interface ModulePlaceholderProps {
  title: string;
  phase: string;
}

export function ModulePlaceholder({ title, phase }: ModulePlaceholderProps) {
  return (
    <Result
      status="info"
      title={title}
      subTitle={`Ce module sera développé en ${phase}, une fois le socle (authentification, organisation, permissions) en place.`}
    />
  );
}
