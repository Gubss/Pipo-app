# Pipo: lembretes que pensam por você

App mobile (iPhone e Android) feito em Expo SDK 58 + expo-router. Você conta para o Pipo o que vem por aí ("casamento domingo às 16h"), ele pergunta o que falta, monta o checklist (cortar o cabelo, comprar presente, separar a roupa) e avisa na hora certa.

## Rodar no celular (sem pagar nada)

Precisa de um computador com [Node.js LTS](https://nodejs.org) e do app **Expo Go** no celular (App Store no iPhone, Play Store no Android).

```bash
npm install
npx expo start
```

- **iPhone:** abra a câmera e aponte para o QR code do terminal. Ele abre no Expo Go.
- **Android:** abra o Expo Go e toque em "Scan QR code".
- O celular e o computador precisam estar no mesmo Wi-Fi. Se não conectar, use `npx expo start --tunnel`.

Cada celular tem os próprios dados: a conta criada no iPhone não aparece no Android (modo local).

## O que tem na v1

- Cadastro e login com e-mail e senha (guardados no aparelho, senha com hash)
- Perfil com nome, CPF (validado, código único), data de nascimento e cidade (digitada ou pela localização)
- Permissões de notificação, microfone e localização, pedidas com explicação
- Conversa com o Pipo: texto, sugestões rápidas e gravação de áudio (guardado junto do evento)
- Checklist automático do evento, com a opção de tirar tarefas antes de salvar
- Notificações: véspera, no dia, e lembretes extras de cada tarefa (opcionais)
- Aniversários que repetem todo ano
- Agenda com os próximos 21 dias
- Rotina: o broto do Pipo cresce com os dias em que você cumpre algo, e o app aprende tarefas que se repetem
- Apagar a conta e todos os dados (LGPD)

## Inteligência do Pipo

Sem configuração, o Pipo usa regras locais (offline) para casamento, aniversário, vacina do pet, médico, viagem, corte de cabelo e festa.

Para ele entender qualquer frase, cole uma chave da API do Claude em **Perfil > Inteligência do Pipo**. A chave fica no Keychain/Keystore do aparelho. **Isso é só para teste pessoal:** num app publicado, a chamada tem que passar por um servidor, senão a chave vaza. O módulo de IA (`src/lib/ai/`) já traz o handler de servidor para essa etapa.

## Limitações conhecidas

- **Voz para texto:** a API do Claude não recebe áudio, e o Expo Go não tem reconhecimento de voz. Por enquanto o áudio fica gravado como nota e o texto vem do microfone do próprio teclado. Na dev build, entra o `expo-speech-recognition` (grátis, no aparelho).
- **Modo local:** sem nuvem, os dados não sincronizam entre aparelhos e somem se o app for desinstalado. A troca para Supabase mantém a mesma interface de `src/lib/auth.tsx` e `src/lib/events.tsx`.
- **Compartilhar com a família:** depende da nuvem; fica para a v2.

## Estrutura

```
src/app/            telas (expo-router)
  (auth)/           boas-vindas, login, cadastro
  onboarding.tsx    perfil + permissões + consentimento
  (tabs)/           início, agenda, Pipo (abre o chat), rotina, perfil
  chat.tsx          conversa com o Pipo
  event/[id].tsx    detalhe do evento e checklist
src/components/     UI, mascote (Pipo), cartões
src/lib/            auth, eventos, notificações, permissões, datas, IA
```

## Comandos úteis

```bash
npx tsc --noEmit                 # checar tipos
npx expo export --platform web   # gerar versão web (para prints)
```
