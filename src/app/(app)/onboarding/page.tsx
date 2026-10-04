'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Loader2,
  CalendarIcon,
  ArrowRight,
  ArrowLeft,
  Building,
  MapPin,
  Globe,
  CalendarDays,
  Landmark,
  Home,
  Users,
  FileText,
  BarChart2,
  Settings,
  Bot,
  Package,
  Activity,
  AlertCircle,
  Search,
  Bell,
  CheckCircle2,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Award,
  LifeBuoy,
  Repeat,
  History,
  Paintbrush,
  Receipt,
  Clock,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackLaunchStage } from '@/lib/launch-telemetry';
import { format } from 'date-fns';
import { ALL_CURRENCIES } from '@/lib/constants';
import { Combobox } from '@/components/ui/combobox';
import { useI18n } from '@/context/i18n-context';
import {
  DEFAULT_LOCALE,
  LOCALES,
  getLocaleDefinition,
  isLocaleCode,
  type LocaleCode,
} from '@/lib/i18n/config';

/**
 * The supported codes as a tuple, so `z.enum` types `data.language` as a
 * `LocaleCode` rather than a bare string — the form value goes straight into
 * `settings.language` and into `setLocale`, and both want the narrow type.
 */
const LOCALE_CODES = LOCALES.map(l => l.code) as [LocaleCode, ...LocaleCode[]];

const onboardingSchemaBase = z.object({
  organizationName: z.string(),
  industry: z.string(),
  customIndustry: z.string().optional(),
  address: z.string().optional(),
  state: z.string(),
  country: z.string(),
  currency: z.string(),
  language: z.enum(LOCALE_CODES),
});

type OnboardingFormValues = z.infer<typeof onboardingSchemaBase>;

interface IndustryOption {
  id: string;
  name: string;
  label: string;
}

const INDUSTRY_OPTIONS: IndustryOption[] = [
  {
    id: 'technology',
    name: 'Technology & Software',
    label: 'Technology & Software',
  },
  {
    id: 'consulting',
    name: 'Consulting & Professional Services',
    label: 'Consulting & Advisory',
  },
  {
    id: 'freelance',
    name: 'Freelancer & Creative Services',
    label: 'Freelance & Creative',
  },
  {
    id: 'agency',
    name: 'Agency & Digital Marketing',
    label: 'Agency & Marketing',
  },
  {
    id: 'legal',
    name: 'Legal, Finance & Accounting',
    label: 'Legal & Accounting',
  },
  {
    id: 'trades',
    name: 'Construction, Trades & Contracting',
    label: 'Construction & Trades',
  },
  {
    id: 'wholesale',
    name: 'Wholesale & B2B Distribution',
    label: 'Wholesale & B2B',
  },
  {
    id: 'healthcare',
    name: 'Healthcare, Clinic & Medical',
    label: 'Healthcare & Medical',
  },
  {
    id: 'education',
    name: 'Education & Training Services',
    label: 'Education & Training',
  },
  {
    id: 'retail',
    name: 'Retail & Commerce',
    label: 'Retail & Commerce',
  },
  {
    id: 'other',
    name: 'Other',
    label: 'Other',
  },
];

const industries = INDUSTRY_OPTIONS.map(i => i.name);
const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

// Map of country name -> ISO 3166-1 alpha-2 code for emoji flag generation
const COUNTRY_CODES: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD", "Angola": "AO",
  "Antigua & Barbuda": "AG", "Argentina": "AR", "Armenia": "AM", "Australia": "AU", "Austria": "AT",
  "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB",
  "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT",
  "Bolivia": "BO", "Bosnia & Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN",
  "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cabo Verde": "CV", "Cambodia": "KH",
  "Cameroon": "CM", "Canada": "CA", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL",
  "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo": "CG", "Costa Rica": "CR",
  "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czechia": "CZ", "DR Congo": "CD",
  "Denmark": "DK", "Djibouti": "DJ", "Dominica": "XCD", "Dominican Republic": "DO", "Ecuador": "EC",
  "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE",
  "Eswatini": "SZ", "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI", "France": "FR",
  "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH",
  "Greece": "GR", "Grenada": "GD", "Guatemala": "GT", "Guinea": "GN", "Guinea-Bissau": "GW",
  "Guyana": "GY", "Haiti": "HT", "Honduras": "HN", "Hungary": "HU", "Iceland": "IS",
  "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP", "Jordan": "JO",
  "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kuwait": "KW", "Kyrgyzstan": "KG",
  "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR",
  "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU", "Madagascar": "MG",
  "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT",
  "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX", "Moldova": "MD", "Monaco": "MC",
  "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
  "Namibia": "NA", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI",
  "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO",
  "Oman": "OM", "Pakistan": "PK", "Palestine": "PS", "Panama": "PA", "Papua New Guinea": "PG",
  "Paraguay": "PY", "Peru": "PE", "Philippines": "PHP", "Poland": "PL", "Portugal": "EUR",
  "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saudi Arabia": "SA",
  "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG",
  "Slovakia": "SK", "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA",
  "South Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD",
  "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Tajikistan": "TJ", "Tanzania": "TZ",
  "Thailand": "TH", "Togo": "TG", "Trinidad & Tobago": "TT", "Tunisia": "TN", "Turkey": "TR",
  "Turkmenistan": "TM", "Uganda": "UG", "Ukraine": "UA", "United Arab Emirates": "AE",
  "United Kingdom": "GB", "United States": "US", "Uruguay": "UY", "Uzbekistan": "UZ",
  "Venezuela": "VES", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW",
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  "Afghanistan": "AFN", "Albania": "ALL", "Algeria": "DZD", "Andorra": "EUR", "Angola": "AOA",
  "Antigua & Barbuda": "XCD", "Argentina": "ARS", "Armenia": "AMD", "Australia": "AUD", "Austria": "EUR",
  "Azerbaijan": "AZN", "Bahamas": "BSD", "Bahrain": "BHD", "Bangladesh": "BDT", "Barbados": "BBD",
  "Belarus": "BYN", "Belgium": "EUR", "Belize": "BZD", "Benin": "XOF", "Bhutan": "BTN",
  "Bolivia": "BOB", "Bosnia & Herzegovina": "BAM", "Botswana": "BWP", "Brazil": "BRL", "Brunei": "BND",
  "Bulgaria": "BGN", "Burkina Faso": "XOF", "Burundi": "BIF", "Cabo Verde": "CVE", "Cambodia": "KHR",
  "Cameroon": "XAF", "Canada": "CAD", "Central African Republic": "XAF", "Chad": "XAF", "Chile": "CLP",
  "China": "CNY", "Colombia": "COP", "Comoros": "KMF", "Congo": "XAF", "Costa Rica": "CRC",
  "Croatia": "EUR", "Cuba": "CUP", "Cyprus": "EUR", "Czechia": "CZK", "DR Congo": "CDF",
  "Denmark": "DKK", "Djibouti": "DJF", "Dominica": "XCD", "Dominican Republic": "DOP", "Ecuador": "USD",
  "Egypt": "EGP", "El Salvador": "USD", "Equatorial Guinea": "XAF", "Eritrea": "ERN", "Estonia": "EUR",
  "Eswatini": "SZL", "Ethiopia": "ETB", "Fiji": "FJD", "Finland": "EUR", "France": "EUR",
  "Gabon": "XAF", "Gambia": "GMD", "Georgia": "GEL", "Germany": "EUR", "Ghana": "GHS",
  "Greece": "EUR", "Grenada": "XCD", "Guatemala": "GTQ", "Guinea": "GNF", "Guinea-Bissau": "XOF",
  "Guyana": "GYD", "Haiti": "HTG", "Honduras": "HNL", "Hungary": "HUF", "Iceland": "ISK",
  "India": "INR", "Indonesia": "IDR", "Iran": "IRR", "Iraq": "IQD", "Ireland": "EUR",
  "Israel": "ILS", "Italy": "EUR", "Jamaica": "JMD", "Japan": "JPY", "Jordan": "JOD",
  "Kazakhstan": "KZT", "Kenya": "KES", "Kiribati": "AUD", "Kuwait": "KWD", "Kyrgyzstan": "KG",
  "Laos": "LAK", "Latvia": "EUR", "Lebanon": "LBP", "Lesotho": "LS", "Liberia": "LRD",
  "Libya": "LYD", "Liechtenstein": "CHF", "Lithuania": "EUR", "Luxembourg": "EUR", "Madagascar": "MGA",
  "Malawi": "MWK", "Malaysia": "MYR", "Maldives": "MVR", "Mali": "XOF", "Malta": "EUR",
  "Mauritania": "MRU", "Mauritius": "MUR", "Mexico": "MXN", "Moldova": "MDL", "Monaco": "EUR",
  "Mongolia": "MNT", "Montenegro": "EUR", "Morocco": "MAD", "Mozambique": "MZN", "Myanmar": "MMK",
  "Namibia": "NAD", "Nepal": "NPR", "Netherlands": "EUR", "New Zealand": "NZD", "Nicaragua": "NIO",
  "Niger": "XOF", "Nigeria": "NGN", "North Korea": "KP", "North Macedonia": "MKD", "Norway": "NOK",
  "Oman": "OMR", "Pakistan": "PKR", "Palestine": "ILS", "Panama": "PAB", "Papua New Guinea": "PGK",
  "Paraguay": "PYG", "Peru": "PEN", "Philippines": "PHP", "Poland": "PLN", "Portugal": "EUR",
  "Qatar": "QAR", "Romania": "RON", "Russia": "RUB", "Rwanda": "RW", "Saudi Arabia": "SA",
  "Senegal": "XOF", "Serbia": "RSD", "Seychelles": "SCR", "Sierra Leone": "SLL", "Singapore": "SGD",
  "Slovakia": "EUR", "Slovenia": "EUR", "Solomon Islands": "SBD", "Somalia": "SOS", "South Africa": "ZAR",
  "South Korea": "KRW", "South Sudan": "SSP", "Spain": "EUR", "Sri Lanka": "LKR", "Sudan": "SDG",
  "Sweden": "SEK", "Switzerland": "CHF", "Syria": "SYP", "Tajikistan": "TJ", "Tanzania": "TZS",
  "Thailand": "THB", "Togo": "XOF", "Trinidad & Tobago": "TTD", "Tunisia": "TND", "Turkey": "TRY",
  "Turkmenistan": "TMT", "Uganda": "UGX", "Ukraine": "UAH", "United Arab Emirates": "AED",
  "United Kingdom": "GBP", "United States": "USD", "Uruguay": "UYU", "Uzbekistan": "UZS",
  "Venezuela": "VES", "Vietnam": "VND", "Yemen": "YER", "Zambia": "ZMW", "Zimbabwe": "ZWL",
};

// Convert ISO code to flag CDN URL
const getFlagUrl = (code: string) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const COUNTRY_OPTIONS = Object.keys(COUNTRY_CODES).map((name) => ({
  label: name,
  value: name,
  flag: getFlagUrl(COUNTRY_CODES[name]),
}));

const LANGUAGE_OPTIONS = LOCALES.map((l) => ({
  value: l.code,
  label: `${l.nativeLabel} (${l.label})`,
}));

const localeDefinitionFor = (value: string) =>
  getLocaleDefinition(isLocaleCode(value) ? value : DEFAULT_LOCALE);

const ONBOARDING_TRANSLATIONS: Record<string, {
  title: string;
  subtitle: string;
  stepProfile: string;
  stepLocation: string;
  stepCurrency: string;
  storeName: string;
  industry: string;
  address: string;
  state: string;
  country: string;
  currency: string;
  language: string;
  next: string;
  back: string;
  finish: string;
  noteCurrency: string;
  noteLanguage: string;
  selectIndustry: string;
  searchIndustries: string;
  selectCountry: string;
  searchCountries: string;
  selectCurrency: string;
  searchCurrencies: string;
  selectLanguage: string;
  searchLanguages: string;
  orgNameMin: string;
  industryMin: string;
  stateMin: string;
  countryMin: string;
  currencyMin: string;
}> = {
  en: {
    title: "Set Up Your Zeneva Account, {name}",
    subtitle: "Quick setup — configure your business profile, default billing currency, and regional settings.",
    stepProfile: "Business Profile",
    stepLocation: "Office Location",
    stepCurrency: "Billing Currency",
    storeName: "Company / Organization Name",
    industry: "Business Industry",
    address: "Office / Business Address",
    state: "State / Province",
    country: "Country",
    currency: "Billing Currency",
    language: "App Language",
    next: "Next",
    back: "Back",
    finish: "Finish Setup",
    noteCurrency: "The currency you select will be used for all client invoices, estimates, receipts, and financial reporting. You can also invoice in multiple currencies at any time.",
    noteLanguage: "Zeneva is set to English by default. If another language suits you better, pick it here — you can change it any time in Settings → General.",
    selectIndustry: "Select an industry",
    searchIndustries: "Search industries...",
    selectCountry: "Select Country",
    searchCountries: "Search countries...",
    selectCurrency: "Select Currency",
    searchCurrencies: "Search currencies...",
    selectLanguage: "Select a language",
    searchLanguages: "Search languages...",
    orgNameMin: "Organization name is required.",
    industryMin: "Please select an industry.",
    stateMin: "State is required.",
    countryMin: "Country is required.",
    currencyMin: "Currency is required."
  },
  es: {
    title: "Configura tu cuenta de Zeneva, {name}",
    subtitle: "Configuración rápida — define el perfil de tu empresa, moneda de facturación y preferencias regionales.",
    stepProfile: "Perfil de la empresa",
    stepLocation: "Ubicación de la oficina",
    stepCurrency: "Moneda de facturación",
    storeName: "Nombre de la empresa / organización",
    industry: "Sector comercial",
    address: "Dirección de la oficina",
    state: "Estado / Provincia",
    country: "País",
    currency: "Moneda de facturación",
    language: "Idioma de la aplicación",
    next: "Siguiente",
    back: "Atrás",
    finish: "Completar configuración",
    noteCurrency: "La moneda que selecciones se utilizará para todas tus facturas, cotizaciones, recibos e informes financieros.",
    noteLanguage: "Zeneva está configurado en inglés por defecto. Si prefieres otro idioma, selecciónalo aquí; puedes cambiarlo en cualquier momento en Ajustes → General.",
    selectIndustry: "Selecciona un sector",
    searchIndustries: "Buscar sectores...",
    selectCountry: "Seleccionar país",
    searchCountries: "Buscar países...",
    selectCurrency: "Seleccionar moneda",
    searchCurrencies: "Buscar monedas...",
    selectLanguage: "Seleccionar idioma",
    searchLanguages: "Buscar idiomas...",
    orgNameMin: "El nombre de la organización es obligatorio.",
    industryMin: "Por favor selecciona un sector.",
    stateMin: "El estado es obligatorio.",
    countryMin: "El país es obligatorio.",
    currencyMin: "La moneda es obligatoria."
  },
  fr: {
    title: "Configurez votre compte Zeneva, {name}",
    subtitle: "Configuration rapide — définissez le profil de votre entreprise, la devise de facturation et les paramètres régionaux.",
    stepProfile: "Profil de l'entreprise",
    stepLocation: "Adresse de l'entreprise",
    stepCurrency: "Devise de facturation",
    storeName: "Nom de l'entreprise / organisation",
    industry: "Secteur d'activité",
    address: "Adresse du siège / bureau",
    state: "État / Province",
    country: "Pays",
    currency: "Devise de facturation",
    language: "Langue de l'application",
    next: "Suivant",
    back: "Retour",
    finish: "Terminer la configuration",
    noteCurrency: "La devise sélectionnée sera utilisée pour vos factures clients, devis, reçus et rapports financiers.",
    noteLanguage: "Zeneva est configuré en anglais par défaut. Si une autre langue vous convient mieux, choisissez-la ici — modifiable à tout moment dans Paramètres → Général.",
    selectIndustry: "Sélectionnez un secteur",
    searchIndustries: "Rechercher des secteurs...",
    selectCountry: "Sélectionner le pays",
    searchCountries: "Rechercher des pays...",
    selectCurrency: "Sélectionner la devise",
    searchCurrencies: "Rechercher des devises...",
    selectLanguage: "Sélectionner une langue",
    searchLanguages: "Rechercher des langues...",
    orgNameMin: "Le nom de l'organisation est requis.",
    industryMin: "Veuillez sélectionner un secteur.",
    stateMin: "L'État est requis.",
    countryMin: "Le pays est requis.",
    currencyMin: "La devise est requise."
  },
  de: {
    title: "Richten Sie Ihr Zeneva-Konto ein, {name}",
    subtitle: "Schnelle Einrichtung — Geschäftsprofil, Abrechnungswährung und regionale Einstellungen festlegen.",
    stepProfile: "Geschäftsprofil",
    stepLocation: "Unternehmensstandort",
    stepCurrency: "Abrechnungswährung",
    storeName: "Name des Unternehmens / der Organisation",
    industry: "Branche",
    address: "Geschäftsadresse",
    state: "Bundesland / Kanton",
    country: "Land",
    currency: "Abrechnungswährung",
    language: "App-Sprache",
    next: "Weiter",
    back: "Zurück",
    finish: "Einrichtung abschließen",
    noteCurrency: "Die gewählte Währung wird für alle Kundenrechnungen, Angebote, Belege und Finanzberichte verwendet.",
    noteLanguage: "Zeneva ist standardmäßig auf Englisch eingestellt. Sie können dies jederzeit unter Einstellungen → Allgemein ändern.",
    selectIndustry: "Branche auswählen",
    searchIndustries: "Branchen suchen...",
    selectCountry: "Land auswählen",
    searchCountries: "Länder suchen...",
    selectCurrency: "Währung auswählen",
    searchCurrencies: "Währungen suchen...",
    selectLanguage: "Sprache auswählen",
    searchLanguages: "Sprachen suchen...",
    orgNameMin: "Name der Organisation ist erforderlich.",
    industryMin: "Bitte wählen Sie eine Branche aus.",
    stateMin: "Bundesland ist erforderlich.",
    countryMin: "Land ist erforderlich.",
    currencyMin: "Währung ist erforderlich."
  },
  it: {
    title: "Configura il tuo account Zeneva, {name}",
    subtitle: "Configurazione rapida — imposta il profilo aziendale, la valuta di fatturazione e le preferenze locali.",
    stepProfile: "Profilo aziendale",
    stepLocation: "Sede aziendale",
    stepCurrency: "Valuta di fatturazione",
    storeName: "Nome azienda / organizzazione",
    industry: "Settore commerciale",
    address: "Indirizzo della sede",
    state: "Stato / Provincia",
    country: "Paese",
    currency: "Valuta di fatturazione",
    language: "Lingua dell'applicazione",
    next: "Avanti",
    back: "Indietro",
    finish: "Completa la configurazione",
    noteCurrency: "La valuta selezionata verrà utilizzata per tutte le fatture clienti, preventivi, ricevute e report contabili.",
    noteLanguage: "Zeneva è impostato su Inglese per impostazione predefinita. Puoi modificarlo in qualsiasi momento in Impostazioni → Generale.",
    selectIndustry: "Seleziona un settore",
    searchIndustries: "Cerca settori...",
    selectCountry: "Seleziona Paese",
    searchCountries: "Cerca paesi...",
    selectCurrency: "Seleziona valuta",
    searchCurrencies: "Cerca valute...",
    selectLanguage: "Seleziona una lingua",
    searchLanguages: "Cerca lingue...",
    orgNameMin: "Il nome dell'organizzazione è richiesto.",
    industryMin: "Seleziona un settore.",
    stateMin: "La provincia è richiesta.",
    countryMin: "Il paese è richiesto.",
    currencyMin: "La valuta è richiesta."
  },
  pt: {
    title: "Configure sua conta Zeneva, {name}",
    subtitle: "Configuração rápida — defina o perfil da sua empresa, moeda padrão de faturamento e preferências regionais.",
    stepProfile: "Perfil da empresa",
    stepLocation: "Localização do escritório",
    stepCurrency: "Moeda de faturamento",
    storeName: "Nome da empresa / organização",
    industry: "Setor comercial",
    address: "Endereço comercial",
    state: "Estado / Província",
    country: "País",
    currency: "Moeda de faturamento",
    language: "Idioma do aplicativo",
    next: "Avançar",
    back: "Voltar",
    finish: "Concluir configuração",
    noteCurrency: "A moeda selecionada será usada para todas as suas faturas de clientes, orçamentos, recibos e relatórios financeiros.",
    noteLanguage: "Zeneva está configurado em Inglês por padrão. Você pode alterar a qualquer momento em Configurações → Geral.",
    selectIndustry: "Selecione um setor",
    searchIndustries: "Buscar setores...",
    selectCountry: "Selecione o País",
    searchCountries: "Buscar países...",
    selectCurrency: "Selecione a moeda",
    searchCurrencies: "Buscar moedas...",
    selectLanguage: "Selecione um idioma",
    searchLanguages: "Buscar idiomas...",
    orgNameMin: "O nome da organização é obrigatório.",
    industryMin: "Por favor, selecione um setor.",
    stateMin: "O estado é obrigatório.",
    countryMin: "O país é obrigatório.",
    currencyMin: "A moeda é obrigatória."
  },
  ar: {
    title: "إعداد حساب Zeneva الخاص بك، {name}",
    subtitle: "إعداد سريع — قم بتهيئة ملف الشركة، عملة الفوترة الافتراضية، والإعدادات الإقليمية.",
    stepProfile: "ملف الشركة",
    stepLocation: "مقر العمل",
    stepCurrency: "عملة الفوترة",
    storeName: "اسم الشركة / المؤسسة",
    industry: "مجال العمل",
    address: "عنوان المكتب / الشركة",
    state: "الولاية / المنطقة",
    country: "البلد",
    currency: "عملة الفوترة",
    language: "لغة التطبيق",
    next: "التالي",
    back: "السابق",
    finish: "إنهاء الإعداد",
    noteCurrency: "سيتم استخدام العملة المحددة لجميع فواتير العملاء، عروض الأسعار، الإيصالات والتقارير المالية.",
    noteLanguage: "تم تعيين Zeneva بالإنجليزية افتراضيًا. يمكنك تغيير اللغة في أي وقت في الإعدادات ← عام.",
    selectIndustry: "اختر مجال العمل",
    searchIndustries: "البحث في مجالات العمل...",
    selectCountry: "اختر البلد",
    searchCountries: "البحث عن البلدان...",
    selectCurrency: "اختر العملة",
    searchCurrencies: "البحث عن العملات...",
    selectLanguage: "اختر اللغة",
    searchLanguages: "البحث عن اللغات...",
    orgNameMin: "اسم المؤسسة مطلوب.",
    industryMin: "يرجى اختيار مجال العمل.",
    stateMin: "المنطقة / الولاية مطلوبة.",
    countryMin: "البلد مطلوب.",
    currencyMin: "العملة مطلوبة."
  },
  hi: {
    title: "अपना Zeneva खाता सेटअप करें, {name}",
    subtitle: "त्वरित सेटअप — अपनी कंपनी प्रोफ़ाइल, बिलिंग मुद्रा और क्षेत्रीय सेटिंग्स कॉन्फ़िगर करें।",
    stepProfile: "कंपनी प्रोफ़ाइल",
    stepLocation: "कार्यालय का पता",
    stepCurrency: "बिलिंग मुद्रा",
    storeName: "कंपनी / संगठन का नाम",
    industry: "उद्योग का प्रकार",
    address: "कार्यालय का पता",
    state: "राज्य / प्रांत",
    country: "देश",
    currency: "बिलिंग मुद्रा",
    language: "ऐप की भाषा",
    next: "अगला",
    back: "पीछे",
    finish: "सेटअप समाप्त करें",
    noteCurrency: "चुनी गई मुद्रा का उपयोग आपके सभी ग्राहक इनवॉइस, कोटेशन, रसीदों और वित्तीय रिपोर्टों के लिए किया जाएगा।",
    noteLanguage: "Zeneva डिफ़ॉल्ट रूप से अंग्रेजी पर सेट है। आप इसे किसी भी समय सेटिंग्स → सामान्य में बदल सकते हैं।",
    selectIndustry: "उद्योग चुनें",
    searchIndustries: "उद्योग खोजें...",
    selectCountry: "देश चुनें",
    searchCountries: "देश खोजें...",
    selectCurrency: "मुद्रा चुनें",
    searchCurrencies: "मुद्रा खोजें...",
    selectLanguage: "भाषा चुनें",
    searchLanguages: "भाषा खोजें...",
    orgNameMin: "संगठन का नाम आवश्यक है।",
    industryMin: "कृपया एक उद्योग चुनें।",
    stateMin: "राज्य आवश्यक है।",
    countryMin: "देश आवश्यक है।",
    currencyMin: "मुद्रा आवश्यक है।"
  },
  ja: {
    title: "Zenevaアカウントを設定する、{name}さん",
    subtitle: "クイック設定 — 会社プロファイル、請求通貨、地域設定を構成します。",
    stepProfile: "会社プロファイル",
    stepLocation: "所在地",
    stepCurrency: "請求通貨",
    storeName: "会社名 / 組織名",
    industry: "業種",
    address: "オフィス所在地",
    state: "都道府県",
    country: "国",
    currency: "請求通貨",
    language: "アプリ言語",
    next: "次へ",
    back: "戻る",
    finish: "設定を完了する",
    noteCurrency: "選択した通貨は、すべてのクライアント請求書、見積書、領収書、財務レポートで使用されます。",
    noteLanguage: "Zenevaはデフォルトで英語に設定されています。設定 → 一般からいつでも変更可能です。",
    selectIndustry: "業種を選択してください",
    searchIndustries: "業種を検索...",
    selectCountry: "国を選択してください",
    searchCountries: "国を検索...",
    selectCurrency: "通貨を選択してください",
    searchCurrencies: "通貨を検索...",
    selectLanguage: "言語を選択してください",
    searchLanguages: "言語を検索...",
    orgNameMin: "組織名は必須です。",
    industryMin: "業種を選択してください。",
    stateMin: "都道府県は必須です。",
    countryMin: "国は必須です。",
    currencyMin: "通貨は必須です。"
  },
  ko: {
    title: "Zeneva 계정 설정하기, {name}님",
    subtitle: "빠른 설정 — 회사 프로필, 기본 청구 통화 및 지역 설정을 구성하세요.",
    stepProfile: "회사 프로필",
    stepLocation: "사업장 위치",
    stepCurrency: "청구 통화",
    storeName: "회사 / 조직명",
    industry: "업종",
    address: "사무실 주소",
    state: "시/도",
    country: "국가",
    currency: "청구 통화",
    language: "앱 언어",
    next: "다음",
    back: "이전",
    finish: "설정 완료",
    noteCurrency: "선택하신 통화는 모든 고객 인보이스, 견적서, 영수증 및 재무 보고서에 기본으로 적용됩니다.",
    noteLanguage: "Zeneva는 기본적으로 영어로 설정되어 있습니다. 설정 → 일반에서 언제든지 변경할 수 있습니다.",
    selectIndustry: "업종 선택",
    searchIndustries: "업종 검색...",
    selectCountry: "국가 선택",
    searchCountries: "국가 검색...",
    selectCurrency: "통화 선택",
    searchCurrencies: "통화 검색...",
    selectLanguage: "언어 선택",
    searchLanguages: "언어 검색...",
    orgNameMin: "회사명은 필수 입력 항목입니다.",
    industryMin: "업종을 선택해 주세요.",
    stateMin: "시/도는 필수 입력 항목입니다.",
    countryMin: "국가는 필수 입력 항목입니다.",
    currencyMin: "통화는 필수 입력 항목입니다."
  },
  zh: {
    title: "设置您的 Zeneva 账户，{name}",
    subtitle: "快速设置 — 配置您的企业资料、默认账单货币及区域选项。",
    stepProfile: "企业资料",
    stepLocation: "办公地址",
    stepCurrency: "账单货币",
    storeName: "公司 / 机构名称",
    industry: "行业类别",
    address: "办公地址",
    state: "省份 / 州",
    country: "国家 / 地区",
    currency: "账单货币",
    language: "应用语言",
    next: "下一步",
    back: "上一步",
    finish: "完成设置",
    noteCurrency: "您选择的货币将用于所有客户发票、报价单、收据和财务报表，并可随时开具多币种发票。",
    noteLanguage: "Zeneva 默认设置为英文。您可在此切换语言，也可随时在“设置 → 常规”中更改。",
    selectIndustry: "选择行业",
    searchIndustries: "搜索行业...",
    selectCountry: "选择国家",
    searchCountries: "搜索国家...",
    selectCurrency: "选择货币",
    searchCurrencies: "搜索货币...",
    selectLanguage: "选择语言",
    searchLanguages: "搜索语言...",
    orgNameMin: "组织名称是必填项。",
    industryMin: "请选择一个行业。",
    stateMin: "省份是必填项。",
    countryMin: "国家是必填项。",
    currencyMin: "货币是必填项。"
  }
};

const OnboardingStepper = ({ currentStep, steps }: { currentStep: number, steps: { name: string, icon: any }[] }) => (
  <nav aria-label="Progress" className="w-full max-w-xl mx-auto px-4 relative mb-10">
    <ol role="list" className="flex items-center justify-between w-full relative">
      {/* Background connecting line */}
      <div className="absolute top-5 left-4 right-4 h-0.5 bg-muted z-0" />

      {/* Active progress line */}
      <div
        className="absolute top-5 left-4 h-0.5 bg-orange-500 transition-all duration-500 ease-in-out z-0"
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 96}%` }}
      />

      {steps.map((step, stepIdx) => {
        const isCompleted = stepIdx < currentStep - 1;
        const isActive = stepIdx === currentStep - 1;

        return (
          <li key={step.name} className="relative flex flex-col items-center flex-1 z-10">
            {isCompleted ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white transition-all duration-300 shadow-md shadow-orange-500/25">
                <step.icon className="h-5 w-5" />
              </div>
            ) : isActive ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-500 bg-background ring-4 ring-orange-500/20 transition-all duration-300 shadow-md">
                <step.icon className="h-5 w-5 text-orange-500" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background transition-all duration-300">
                <step.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}

            <span className={cn(
              "mt-3 text-xs font-semibold whitespace-nowrap transition-colors duration-300",
              isActive ? "text-orange-600 dark:text-orange-400 font-bold" : "text-muted-foreground"
            )}>
              {step.name}
            </span>
          </li>
        );
      })}
    </ol>
  </nav>
);

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { business, currentUserProfile } = usePOS();
  const { locale, setLocale } = useI18n();

  const t = React.useMemo(() => {
    return ONBOARDING_TRANSLATIONS[locale] || ONBOARDING_TRANSLATIONS.en;
  }, [locale]);

  const schema = React.useMemo(() => {
    return z.object({
      organizationName: z.string().min(3, t.orgNameMin),
      industry: z.string().min(1, t.industryMin),
      customIndustry: z.string().optional(),
      address: z.string().optional(),
      state: z.string().min(2, t.stateMin),
      country: z.string().min(2, t.countryMin),
      currency: z.string().min(1, t.currencyMin),
      language: z.enum(LOCALE_CODES),
    }).superRefine((data, ctx) => {
      if (data.industry === 'Other' && (!data.customIndustry || data.customIndustry.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please specify your industry.",
          path: ["customIndustry"],
        });
      }
    });
  }, [t]);

  const steps = React.useMemo(() => [
    { name: t.stepProfile, icon: Building, fields: ['organizationName', 'industry', 'customIndustry', 'language'] },
    { name: t.stepLocation, icon: MapPin, fields: ['address', 'state', 'country'] },
    { name: t.stepCurrency, icon: Landmark, fields: ['currency'] },
  ], [t]);

  const [mounted, setMounted] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const authUser = getAuth().currentUser;
    if (authUser && firestore && mounted) {
      import('firebase/firestore').then(({ setDoc, doc, serverTimestamp }) => {
        setDoc(doc(firestore, 'users', authUser.uid), {
          onboardingStep: step,
          onboardingLastActive: serverTimestamp()
        }, { merge: true }).catch(() => { });
      });
    }
  }, [step, firestore, mounted]);

  const [currencies] = React.useState(ALL_CURRENCIES);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationName: business?.name || '',
      industry: '',
      address: '',
      state: '',
      country: '',
      currency: 'NGN',
      language: locale,
    },
  });

  const selectedCountry = form.watch('country');

  React.useEffect(() => {
    if (selectedCountry && COUNTRY_TO_CURRENCY[selectedCountry]) {
      form.setValue('currency', COUNTRY_TO_CURRENCY[selectedCountry], { shouldValidate: true });
    }
  }, [selectedCountry, form]);

  const languageTouchedRef = React.useRef(false);

  React.useEffect(() => {
    if (languageTouchedRef.current) return;
    if (form.getValues('language') === locale) return;
    form.setValue('language', locale);
  }, [locale, form]);

  const onSubmit = async (data: OnboardingFormValues) => {
    if (step < steps.length) return;

    const authUser = getAuth().currentUser;
    const bId = currentUserProfile?.businessId || business?.id;

    if (!authUser || !bId) {
      toast({ variant: 'destructive', title: 'Session Error', description: 'Your session has expired. Please log in again.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(firestore);

      let localTimezone = 'Africa/Lagos';
      try {
        localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos';
      } catch { }

      // 1. Update Business Instance
      const businessDocRef = doc(firestore, 'businessInstances', bId);
      const finalIndustry = data.industry === 'Other' && data.customIndustry 
        ? data.customIndustry 
        : data.industry;

      batch.update(businessDocRef, {
        name: data.organizationName,
        address: data.address,
        'settings.industry': finalIndustry,
        'settings.state': data.state,
        'settings.country': data.country,
        'settings.currency': data.currency,
        'settings.language': data.language,
        'settings.timezone': localTimezone,
        'settings.inventoryStartDate': new Date(),
        'settings.fiscalYearStart': 'January',
      });

      // 2. Update User Profile
      const userDocRef = doc(firestore, 'users', authUser.uid);
      batch.update(userDocRef, {
        surveyCompleted: true,
      });

      // 3. Create Welcome Notification
      const notifRef = doc(collection(firestore, `users/${authUser.uid}/notifications`));
      batch.set(notifRef, {
        title: "Welcome to Zeneva Invoice",
        body: `Hi ${currentUserProfile?.name || 'there'}, your organization setup for ${data.organizationName} is complete. Explore your dashboard to create your first invoice!`,
        createdAt: serverTimestamp(),
        read: false,
        type: 'system',
        clickable: false
      });

      await batch.commit();

      if (data.language !== locale) setLocale(data.language);

      sessionStorage.setItem('zeneva_onboarding_complete', 'true');
      localStorage.setItem('zeneva_needs_tour', 'true');

      toast({ variant: 'success', title: 'Setup Complete!', description: 'Welcome to your Zeneva Invoice dashboard.' });
      void trackLaunchStage('onboarding_completed');
      router.push('/getting-started');
    } catch (error) {
      console.error('Onboarding submission error:', error);
      void trackLaunchStage('signup_failed', 'onboarding-submit');
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your preferences. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const advancingRef = React.useRef(false);

  const handleNextStep = async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      const fieldsToValidate = steps[step - 1].fields as (keyof OnboardingFormValues)[];
      const isValid = await form.trigger(fieldsToValidate);
      if (isValid) {
        setStep(prev => Math.min(prev + 1, steps.length));
      }
    } finally {
      advancingRef.current = false;
    }
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  if (!mounted || !business || !currentUserProfile) {
    return <div className="flex justify-center items-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Underlying realistic Zeneva Invoice dashboard preview */}
      <div
        className="fixed inset-0 pointer-events-none select-none overflow-hidden filter blur-[2px] opacity-75 dark:opacity-60 scale-[1.01]"
        aria-hidden="true"
      >
        <div className="flex h-screen w-full bg-background text-foreground">
          {/* Authentic Zeneva Invoice Sidebar */}
          <aside className="hidden lg:flex w-64 flex-col border-r bg-card/85 shrink-0 select-none">
            {/* Sidebar Header */}
            <div className="h-16 flex items-center gap-3 px-5 border-b">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-orange-500/25">
                Z
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm leading-tight truncate">Zeneva Invoice</div>
                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Organization Active
                </div>
              </div>
            </div>

            {/* Sidebar Menu */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
              <div className="space-y-0.5">
                <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Overview</div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold text-xs">
                  <Home className="h-4 w-4 text-orange-500" />
                  <span>Dashboard</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <FileText className="h-4 w-4" />
                  <span>Invoices</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Calculator className="h-4 w-4" />
                  <span>Quotes & Estimates</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Repeat className="h-4 w-4" />
                  <span>Recurring Billing</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <CreditCard className="h-4 w-4" />
                  <span>Payments Received</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Users className="h-4 w-4" />
                  <span>Clients & Customers</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Time & Expenses</div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Receipt className="h-4 w-4" />
                  <span>Expenses</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Award className="h-4 w-4" />
                  <span>Client Projects</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Clock className="h-4 w-4" />
                  <span>Time Logs</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Analytics & AI</div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <BarChart2 className="h-4 w-4" />
                  <span>Financial Reports</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Bot className="h-4 w-4 text-orange-500" />
                  <span>Zen AI Copilot</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Paintbrush className="h-4 w-4" />
                  <span>Invoice Templates</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Configuration</div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 text-xs">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
              </div>
            </div>

            {/* Sidebar User Profile Footer */}
            <div className="p-3 border-t bg-muted/20 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-600 font-bold text-xs flex items-center justify-center">
                {currentUserProfile?.name ? currentUserProfile.name.slice(0, 2).toUpperCase() : 'ZI'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate">{currentUserProfile?.name || 'Organization Owner'}</div>
                <div className="text-[10px] text-orange-600 font-medium">Owner</div>
              </div>
            </div>
          </aside>

          {/* Main Workspace Area */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b bg-card/60 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 flex-1 max-w-md">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background/80 text-muted-foreground text-xs w-full">
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  <span>Search invoices, clients, quotes, expenses... (Ctrl+K)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Invoicing Engine Ready</span>
                </div>
                <div className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60">
                  <Bell className="h-3.5 w-3.5" />
                  <span className="h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                </div>
                <div className="h-8 px-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm">
                  <Bot className="h-3.5 w-3.5" />
                  <span>Ask Zen AI</span>
                </div>
              </div>
            </header>

            {/* Dashboard Content Container */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
              {/* Page Title & Controls */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold tracking-tight">Invoice Dashboard</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time overview of client receivables, cash flow, and recurring billings.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg border bg-card text-xs text-muted-foreground flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Today: {format(new Date(), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium">
                    + New Invoice
                  </div>
                </div>
              </div>

              {/* Today's Focus Card */}
              <div className="p-4 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-card to-card flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/20 text-orange-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Receivables Focus</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 font-semibold">Action Due</span>
                    </div>
                    <p className="text-xs text-foreground font-medium mt-0.5">3 client invoices totaling ₦485,000 are due today — send automatic email payment reminders.</p>
                  </div>
                </div>
                <div className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                  Send Reminders <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Summary Metrics (6 Cards in Grid) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                  { title: 'Total Invoiced', value: '₦3,850,400', sub: '+18.4% vs last month', icon: DollarSign, color: 'text-emerald-500 bg-emerald-500/10' },
                  { title: 'Payments Collected', value: '₦2,920,150', sub: '75.8% collection rate', icon: CheckCircle2, color: 'text-blue-500 bg-blue-500/10' },
                  { title: 'Outstanding Due', value: '₦930,250', sub: '4 pending invoices', icon: AlertCircle, color: 'text-orange-500 bg-orange-500/10' },
                  { title: 'Active Clients', value: '42 Accounts', sub: '+5 new this month', icon: Users, color: 'text-amber-500 bg-amber-500/10' },
                  { title: 'Recurring Retainers', value: '₦450,000', sub: 'Monthly subscription', icon: Repeat, color: 'text-teal-500 bg-teal-500/10' },
                  { title: 'Quote Acceptance', value: '82.5%', sub: '14 of 17 accepted', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10' },
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="p-3.5 rounded-xl border bg-card/85 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground truncate">{stat.title}</span>
                        <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", stat.color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div className="text-lg font-bold tracking-tight">{stat.value}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{stat.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Charts & Analytics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Revenue Velocity Chart */}
                <div className="lg:col-span-2 p-5 rounded-xl border bg-card/85 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold">Billing & Inflow Velocity</h4>
                      <p className="text-[11px] text-muted-foreground">Monthly invoiced totals vs collected client payments</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-orange-500" /> Invoiced
                      <span className="h-2 w-2 rounded-full bg-emerald-500 ml-2" /> Collected
                    </div>
                  </div>
                  {/* Visual Chart Wave */}
                  <div className="h-44 w-full flex items-end gap-2.5 pt-6 px-2">
                    {[40, 52, 65, 58, 76, 68, 85, 90, 82, 94, 88, 75, 89, 98, 92, 86].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div
                          className="w-full rounded-t-sm bg-gradient-to-t from-orange-500/20 via-orange-500/60 to-orange-500 transition-all"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[9px] text-muted-foreground/60">{`W${(i % 4) + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Breakdown */}
                <div className="p-5 rounded-xl border bg-card/85 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-bold">Revenue by Service</h4>
                    <p className="text-[11px] text-muted-foreground">Top client billing categories</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {[
                      { name: 'Software & Cloud Solutions', pct: 42, amt: '₦1,617,168', color: 'bg-orange-500' },
                      { name: 'Retainer & Advisory Services', pct: 28, amt: '₦1,078,112', color: 'bg-amber-500' },
                      { name: 'UI/UX & Product Design', pct: 18, amt: '₦693,072', color: 'bg-emerald-500' },
                      { name: 'Maintenance & Support', pct: 12, amt: '₦462,048', color: 'bg-blue-500' },
                    ].map((cat, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="truncate">{cat.name}</span>
                          <span>{cat.amt}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", cat.color)} style={{ width: `${cat.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Invoices Table */}
              <div className="p-5 rounded-xl border bg-card/85 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">Recent Issued Invoices</h4>
                  <span className="text-xs text-orange-600 font-medium">View All Invoices →</span>
                </div>
                <div className="divide-y text-xs">
                  {[
                    { id: 'INV-2026-004', client: 'Apex Technologies Ltd', desc: 'Web & Mobile App Development', total: '₦1,250,000', time: 'Today', status: 'Paid', statusColor: 'text-emerald-500 bg-emerald-500/10' },
                    { id: 'INV-2026-003', client: 'Meridian Capital Group', desc: 'Cloud Infrastructure Setup', total: '₦820,000', time: 'Yesterday', status: 'Pending', statusColor: 'text-amber-500 bg-amber-500/10' },
                    { id: 'INV-2026-002', client: 'Nexus Media Labs', desc: 'Brand Design & UI Kit', total: '₦450,000', time: '2 days ago', status: 'Paid', statusColor: 'text-emerald-500 bg-emerald-500/10' },
                    { id: 'INV-2026-001', client: 'Sterling Logistics LLC', desc: 'Enterprise Retainer Q1', total: '₦1,330,400', time: '4 days ago', status: 'Paid', statusColor: 'text-emerald-500 bg-emerald-500/10' },
                  ].map((row, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">{row.id}</span>
                      <span className="font-medium text-foreground">{row.client}</span>
                      <span className="hidden sm:inline">{row.desc}</span>
                      <span className="font-bold text-foreground">{row.total}</span>
                      <span className="text-[11px]">{row.time}</span>
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", row.statusColor)}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Glassmorphic Onboarding Modal */}
      <div className="fixed inset-0 z-50 w-full flex flex-col items-center justify-center min-h-screen py-8 px-4 lg:px-8 bg-background/40 dark:bg-black/45 overflow-y-auto backdrop-blur-[2px]">
        <div className="w-full max-w-4xl space-y-5 sm:space-y-6 bg-gradient-to-b from-orange-500/10 via-card/95 to-card/95 dark:via-card/85 dark:to-card/85 backdrop-blur-sm border border-dashed border-orange-500/40 p-6 sm:p-8 rounded-xl my-auto shadow-none">
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              {t.title.replace('{name}', currentUserProfile?.name ? currentUserProfile.name.split(' ')[0] : 'there')}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          <OnboardingStepper currentStep={step} steps={steps} />

          <Card className="mt-4 sm:mt-6 bg-transparent border-0 shadow-none">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {step === 1 && (
                      <CardContent className="pt-2 pb-2 space-y-5">
                        <CardTitle className="flex items-center gap-3 text-lg sm:text-2xl font-bold">
                          <Building className="text-orange-500 h-5 w-5 sm:h-6 sm:w-6" /> {t.stepProfile}
                        </CardTitle>
                        <FormField control={form.control} name="organizationName" render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-xs sm:text-sm font-semibold">{t.storeName} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Acme Studio or Zenith Global" className="h-10 sm:h-12 text-sm shadow-none focus-visible:ring-orange-500" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )} />
                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field, fieldState }) => (
                            <FormItem className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-xs sm:text-sm font-semibold">
                                  {t.industry} <span className="text-destructive">*</span>
                                </FormLabel>
                                {field.value && (
                                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                    {INDUSTRY_OPTIONS.find((i) => i.name === field.value)?.label || field.value}
                                  </span>
                                )}
                              </div>
                              <FormControl>
                                <div
                                  role="radiogroup"
                                  aria-label={t.industry}
                                  className={cn(
                                    "flex flex-wrap gap-2 sm:gap-2.5 pt-1 pb-1 transition-colors",
                                    fieldState.error
                                      ? "p-2 rounded-xl bg-destructive/5 border border-dashed border-destructive/40"
                                      : ""
                                  )}
                                >
                                  {INDUSTRY_OPTIONS.map((item) => {
                                    const isSelected = field.value === item.name;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => {
                                          field.onChange(item.name);
                                        }}
                                        className={cn(
                                          "rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer select-none",
                                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1",
                                          isSelected
                                            ? "bg-orange-500 text-white border border-orange-500 shadow-sm shadow-orange-500/25"
                                            : "bg-background hover:bg-muted text-foreground border border-border/80 dark:border-border/60 hover:border-foreground/30"
                                        )}
                                      >
                                        {item.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )}
                        />
                        {form.watch("industry") === "Other" && (
                          <FormField control={form.control} name="customIndustry" render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-xs sm:text-sm font-semibold">Please specify your industry <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Architectural Design & Planning" className="h-10 sm:h-12 text-sm shadow-none focus-visible:ring-orange-500" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )} />
                        )}
                        <FormField control={form.control} name="language" render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-xs sm:text-sm font-semibold">{t.language}</FormLabel>
                            <FormControl>
                              <Combobox
                                options={LANGUAGE_OPTIONS}
                                value={field.value}
                                onChange={(value) => {
                                  if (!isLocaleCode(value)) return;
                                  languageTouchedRef.current = true;
                                  field.onChange(value);
                                  if (value !== locale) setLocale(value);
                                }}
                                placeholder={t.selectLanguage}
                                searchPlaceholder={t.searchLanguages}
                                triggerClassName="h-10 sm:h-12 text-sm font-normal justify-between w-full active:scale-100 transition-colors shadow-none"
                                avoidCollisions={false}
                                renderSelected={(opt) => (
                                  <span className="flex items-center gap-2">
                                    <img
                                      src={`https://flagcdn.com/w40/${localeDefinitionFor(opt.value).flag}.png`}
                                      alt=""
                                      className="w-5 h-3.5 rounded-sm object-cover shrink-0"
                                    />
                                    <span>{localeDefinitionFor(opt.value).nativeLabel}</span>
                                  </span>
                                )}
                                renderItem={(opt) => (
                                  <span className="flex items-center gap-2">
                                    <img
                                      src={`https://flagcdn.com/w40/${localeDefinitionFor(opt.value).flag}.png`}
                                      alt=""
                                      className="w-5 h-3.5 rounded-sm object-cover shrink-0"
                                    />
                                    <span>{opt.label}</span>
                                  </span>
                                )}
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )} />
                        <div className="text-[10px] sm:text-xs text-muted-foreground p-3 sm:p-4 bg-muted/50 rounded-xl border border-muted">
                          <strong>Note:</strong> {t.noteLanguage}
                        </div>
                      </CardContent>
                    )}
                    {step === 2 && (
                      <CardContent className="pt-2 pb-2 space-y-5">
                        <CardTitle className="flex items-center gap-3 text-lg sm:text-2xl font-bold">
                          <MapPin className="text-orange-500 h-5 w-5 sm:h-6 sm:w-6" /> {t.stepLocation}
                        </CardTitle>
                        <FormField control={form.control} name="address" render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-xs sm:text-sm font-semibold">{t.address}</FormLabel>
                            <FormControl>
                              <Input className="h-10 sm:h-12 text-sm shadow-none focus-visible:ring-orange-500" placeholder="Street Address / Suite / Floor" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <FormField control={form.control} name="state" render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-xs sm:text-sm font-semibold">{t.state} <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input className="h-10 sm:h-12 text-sm shadow-none focus-visible:ring-orange-500" placeholder="State or Province" {...field} />
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem className="space-y-2 flex flex-col justify-end">
                              <FormLabel className="text-xs sm:text-sm font-semibold">{t.country} <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Combobox
                                  options={COUNTRY_OPTIONS}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder={t.selectCountry}
                                  searchPlaceholder={t.searchCountries}
                                  triggerClassName="h-10 sm:h-12 text-sm font-normal justify-between w-full"
                                  avoidCollisions={false}
                                  renderSelected={(opt) => (
                                    <span className="flex items-center gap-2">
                                      <img src={opt.flag} alt={opt.label} className="w-5 h-3.5 rounded-sm object-cover shrink-0" />
                                      <span>{opt.label}</span>
                                    </span>
                                  )}
                                  renderItem={(opt) => (
                                    <span className="flex items-center gap-2">
                                      <img src={opt.flag} alt={opt.label} className="w-5 h-3.5 rounded-sm object-cover shrink-0" />
                                      <span>{opt.label}</span>
                                    </span>
                                  )}
                                />
                              </FormControl>
                              <FormMessage className="text-[11px]" />
                            </FormItem>
                          )} />
                        </div>
                      </CardContent>
                    )}
                    {step === 3 && (
                      <CardContent className="pt-2 pb-2 space-y-5">
                        <CardTitle className="flex items-center gap-3 text-lg sm:text-2xl font-bold">
                          <Landmark className="text-orange-500 h-5 w-5 sm:h-6 sm:w-6" /> {t.stepCurrency}
                        </CardTitle>
                        <FormField control={form.control} name="currency" render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-xs sm:text-sm font-semibold">{t.currency} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Combobox
                                options={currencies}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder={t.selectCurrency}
                                searchPlaceholder={t.searchCurrencies}
                                triggerClassName="h-10 sm:h-12 text-sm font-normal justify-between w-full"
                              />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )} />
                        <div className="text-[10px] sm:text-xs text-muted-foreground p-3 sm:p-4 bg-muted/50 rounded-xl border border-muted">
                          <strong>Note:</strong> {t.noteCurrency}
                        </div>
                      </CardContent>
                    )}
                  </motion.div>
                </AnimatePresence>
                <CardContent className="flex justify-between pt-4 sm:pt-6">
                  {step > 1 ? (
                    <Button type="button" variant="outline" size="sm" className="sm:size-default" onClick={handlePrevStep}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
                    </Button>
                  ) : (<div />)}
                  {step < steps.length ? (
                    <Button
                      key="next-step"
                      type="button"
                      size="sm"
                      className="sm:size-default bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm shadow-orange-500/20"
                      onClick={handleNextStep}
                    >
                      {t.next} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      key="finish-setup"
                      type="submit"
                      size="sm"
                      className="sm:size-default bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm shadow-orange-500/20"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t.finish}
                    </Button>
                  )}
                </CardContent>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
