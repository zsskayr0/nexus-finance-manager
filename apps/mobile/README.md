# Nexus Mobile — próximos passos

Ainda não scaffolded nesta sessão (ficou combinado começar por `packages/core`
+ `apps/desktop`, já que este ambiente não tem Android SDK/Xcode instalados
para rodar um build real do React Native).

Quando formos iniciar este app, o plano é:

```bash
npx @react-native-community/cli init NexusMobile --directory apps/mobile
```

seguido da instalação dos módulos nativos específicos dos requisitos do Nexus:

| Necessidade | Pacote |
|---|---|
| Share Intent (Android `ACTION_SEND` / iOS Share Extension) | `react-native-receive-sharing-intent` |
| Seleção da galeria | `expo-image-picker` (ou `react-native-image-picker` em bare RN) |
| OCR on-device gratuito | `@react-native-ml-kit/text-recognition` |
| Banco local | `op-sqlite` (schema em `packages/core/src/schema.sql`) |
| Worker de backup em background | `react-native-background-fetch` |
| Estilo Tailwind consistente com o Desktop | `nativewind` |

A lógica de negócio (schema, tipos Zod, parsing de OCR, CSV, recorrências)
já está pronta e é 100% reaproveitável em `packages/core` — nenhuma dessas
regras precisa ser reescrita para o mobile, só a camada de UI e os módulos
nativos acima.

Pré-requisito antes de scaffolded de verdade: Android Studio (SDK + emulador)
e, para build iOS, um Mac com Xcode.
