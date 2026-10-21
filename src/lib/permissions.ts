import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export { ensureNotificationPermission } from './notifications';

export type CityResult = { city: string; latitude: number; longitude: number } | { error: string };

/** Pede a localização e descobre a cidade (ex.: "Mongaguá - SP"). */
export async function detectCity(): Promise<CityResult> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return { error: 'Sem permissão de localização. Você pode digitar a cidade.' };
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = pos.coords;
    if (Platform.OS === 'web') return { city: '', latitude, longitude };
    const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const name = addr?.city ?? addr?.subregion ?? '';
    const uf = addr?.region ? stateCode(addr.region) : '';
    return { city: [name, uf].filter(Boolean).join(' - '), latitude, longitude };
  } catch {
    return { error: 'Não consegui achar sua localização agora. Digite a cidade.' };
  }
}

export async function ensureMicPermission() {
  const res = await requestRecordingPermissionsAsync();
  return res.granted;
}

const UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE',
  'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA',
  paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

function stateCode(region: string) {
  if (region.length === 2) return region.toUpperCase();
  const key = region.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return UF[key] ?? region;
}
