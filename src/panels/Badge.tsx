import { useTranslation } from 'react-i18next';

/** A small label for anything less certain than "documented". */
export function Badge({ confidence }: { confidence: string }) {
  const { t } = useTranslation();
  if (confidence === 'documented') return null;
  return <span className={`badge conf-${confidence}`}>{t(`confidence.${confidence}`)}</span>;
}
