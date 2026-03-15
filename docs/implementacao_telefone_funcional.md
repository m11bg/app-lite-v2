# Implementação: Telefone Funcional (Ligação + WhatsApp)

> **Objetivo:** Tornar o número de telefone exibido no `ProfileHeader` interativo, permitindo ao usuário fazer uma ligação ou iniciar conversa no WhatsApp.

---

## 📋 Índice

1. [Diagnóstico do Estado Atual](#1-diagnóstico-do-estado-atual)
2. [Problemas Identificados no Documento Original](#2-problemas-identificados-no-documento-original)
3. [Plano de Implementação Corrigido](#3-plano-de-implementação-corrigido)
4. [Alterações por Arquivo](#4-alterações-por-arquivo)
5. [Testes Necessários](#5-testes-necessários)
6. [Checklist Final](#6-checklist-final)

---

## 1. Diagnóstico do Estado Atual

### Arquivo principal: `packages/mobile/src/components/profile/ProfileHeader.tsx`

- O telefone é exibido em **dois blocos duplicados** (modo `isPreview` nas linhas ~117–122 e modo `isPublicView` nas linhas ~135–140).
- Ambos usam `<View>` para a linha do telefone — **não é clicável**.
- Já importa `formatPhoneNumber` de `@/utils/phoneFormatter`.

### Utilitário existente: `packages/mobile/src/utils/phoneFormatter.ts`

- `removeNonNumeric(value)` — remove tudo que não é dígito. **Já existe e será reutilizada.**
- `formatPhoneNumber(value)` — formata para exibição BR. **Limita a 11 dígitos** (DDD + número). Se o telefone vier do backend com prefixo `55` (código do país), a **exibição será truncada/incorreta**.
- `isValidPhoneNumber(value)` — validação básica de telefone BR.

### Utilitário cross-platform de alertas: `packages/mobile/src/utils/alert.ts`

- **O projeto já possui** o `showAlert()`, que funciona em Web (via `dialogManager` + `GlobalDialog`), iOS e Android.
- `Alert.alert()` nativo do React Native **NÃO funciona na Web**. O documento original sugere usá-lo diretamente — isso **quebraria na plataforma Web**.
- **Limitação:** o `showAlert` na Web só suporta 2 botões (confirmar + cancelar). Um menu com 3 opções (Ligação / WhatsApp / Cancelar) não funcionaria corretamente na Web.

### Tipo: `packages/mobile/src/types/profilePreview.ts`

- `PrestadorResumo.telefone` é `string | undefined`.
- `toPrestadorResumo()` aceita múltiplos campos do backend: `telefone`, `phone`, `celular`, `contato`. O formato armazenado **não é garantido** (pode conter ou não o `55`).

### Testes existentes: `packages/mobile/src/components/profile/__tests__/ProfileHeader.test.tsx`

- 10 testes cobrindo renderização, navegação e estados.
- Mock de `react-native` já inclui `TouchableOpacity`.
- O `mockUser` já possui `telefone: '(11) 98765-4321'`.
- **Testes precisarão ser atualizados** para cobrir o comportamento de toque no telefone.

---

## 2. Problemas Identificados no Documento Original

| #  | Problema | Severidade | Descrição |
|----|----------|------------|-----------|
| 1  | `Alert.alert()` não funciona na Web | 🔴 Crítico | O app roda em Web, Android e iOS. Usar `Alert.alert()` direto quebra na Web. O projeto já tem `showAlert` cross-platform em `@/utils/alert.ts`. |
| 2  | `showAlert` na Web só suporta 2 botões | 🟡 Médio | O `dialogManager` simplifica para confirmar/cancelar. Um menu com 3 opções (Ligar / WhatsApp / Cancelar) não funciona na Web com o utilitário atual. |
| 3  | `formatPhoneNumber` trunca telefones com `55` | 🟡 Médio | Se o backend enviar `5511999887766` (13 dígitos), o `slice(0, 11)` corta e exibe incorretamente. |
| 4  | Sem `Linking.canOpenURL()` para verificar suporte | 🟡 Médio | `Linking.openURL` pode falhar silenciosamente (ex: WhatsApp não instalado). |
| 5  | Falta `useCallback` no handler | 🟢 Menor | Causa rerenders desnecessários ao passar como prop ou no `onPress`. |
| 6  | Falta de acessibilidade (`accessibilityRole`, `accessibilityLabel`) | 🟢 Menor | O projeto segue boas práticas de acessibilidade em outros componentes (ex: `VerifiedBadge`). |
| 7  | Código duplicado nos blocos `isPreview` e `isPublicView` | 🟢 Menor | Ambos renderizam a mesma UI de contato — deveria ser extraído em sub-componente. |
| 8  | Sem tracking de analytics | 🟢 Menor | O componente já usa `AnalyticsService.track()` para outras ações; o toque no telefone deveria ser trackeado. |

---

## 3. Plano de Implementação Corrigido

### Abordagem recomendada: **Ícones Separados (Telefone + WhatsApp)**

Em vez de um `Alert` com 3 opções (que não funciona bem na Web), a abordagem mais robusta e intuitiva é usar **dois ícones distintos**: um para ligação e outro para WhatsApp.

**Vantagens:**
- ✅ Funciona cross-platform (Web, iOS, Android) sem adaptações.
- ✅ UX mais intuitiva — o usuário vê claramente as duas opções.
- ✅ Elimina a limitação do `showAlert` na Web com 3 botões.
- ✅ Elimina a duplicação de código extraindo um sub-componente.

---

## 4. Alterações por Arquivo

### 4.1. `packages/mobile/src/utils/phoneFormatter.ts`

**O que fazer:** Adicionar uma função utilitária para normalizar o telefone para o formato E.164 (com código do país), resolvendo o TODO já listado na linha 11 do arquivo.

**Adicionar ao final do arquivo (antes do `export default`):**

```ts
/**
 * Normaliza um número de telefone brasileiro para uso com APIs externas.
 * Remove caracteres não numéricos e garante o prefixo do país (55).
 *
 * @param value - Telefone em qualquer formato
 * @returns Apenas dígitos com prefixo 55 (ex: "5511999887766")
 */
export function toE164Digits(value: string): string {
    const digits = removeNonNumeric(value);

    // Se já tem 12-13 dígitos e começa com 55, já está no formato correto
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
        return digits;
    }

    // Se tem 10-11 dígitos (formato nacional), adiciona o 55
    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }

    // Fallback: retorna o que tem (pode ser incompleto)
    return digits;
}

/**
 * Normaliza um telefone para exibição, removendo o código do país se presente.
 * Garante que formatPhoneNumber receba apenas os 10-11 dígitos nacionais.
 *
 * @param value - Telefone em qualquer formato
 * @returns Telefone formatado para exibição BR: "(XX) XXXXX-XXXX"
 */
export function formatPhoneForDisplay(value: string): string {
    const digits = removeNonNumeric(value);

    // Se começa com 55 e tem 12-13 dígitos, remove o código do país antes de formatar
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
        return formatPhoneNumber(digits.slice(2));
    }

    return formatPhoneNumber(digits);
}
```

**Atualizar o `export default`:**

```ts
export default {
    formatPhoneNumber,
    formatPhoneForDisplay,
    toE164Digits,
    isValidPhoneNumber,
    removeNonNumeric,
    usePhoneFormatter,
};
```

---

### 4.2. `packages/mobile/src/components/profile/ProfileHeader.tsx`

#### 4.2.1. Atualizar imports (linha 1-15)

**Antes:**
```tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
// ...
import { formatPhoneNumber } from '@/utils/phoneFormatter';
```

**Depois:**
```tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, Platform, TouchableOpacity } from 'react-native';
// ...
import { formatPhoneForDisplay, toE164Digits } from '@/utils/phoneFormatter';
import { showAlert } from '@/utils/alert';
import AnalyticsService from '@/services/AnalyticsService';
```

> **Nota:** `AnalyticsService` já está importado (linha 8). Não duplicar.

---

#### 4.2.2. Adicionar funções de contato dentro do componente (após as variáveis derivadas, ~linha 65)

```tsx
/**
 * Abre o discador nativo com o número de telefone.
 * Verifica se o dispositivo suporta o protocolo tel: antes de abrir.
 */
const handleCall = useCallback(async (phone: string): Promise<void> => {
    const digits = toE164Digits(phone);
    // Para ligação, usa apenas os dígitos nacionais (sem código do país)
    const nationalDigits = digits.startsWith('55') ? digits.slice(2) : digits;
    const url = `tel:${nationalDigits}`;

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            AnalyticsService.track('profile_phone_call', { profileId });
            await Linking.openURL(url);
        } else {
            showAlert('Erro', 'Não foi possível abrir o discador neste dispositivo.');
        }
    } catch {
        showAlert('Erro', 'Ocorreu um erro ao tentar fazer a ligação.');
    }
}, [profileId]);

/**
 * Abre o WhatsApp com o número do prestador.
 * Utiliza o formato internacional (com código 55 do Brasil).
 */
const handleWhatsApp = useCallback(async (phone: string): Promise<void> => {
    const waNumber = toE164Digits(phone);
    const url = `https://wa.me/${waNumber}`;

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            AnalyticsService.track('profile_whatsapp_click', { profileId });
            await Linking.openURL(url);
        } else {
            showAlert(
                'WhatsApp indisponível',
                'Não foi possível abrir o WhatsApp. Verifique se o app está instalado.'
            );
        }
    } catch {
        showAlert('Erro', 'Ocorreu um erro ao tentar abrir o WhatsApp.');
    }
}, [profileId]);
```

---

#### 4.2.3. Extrair sub-componente `ContactInfo` (antes do `VerifiedBadge`, ~linha 195)

Eliminar a duplicação dos blocos `isPreview` e `isPublicView`:

```tsx
/**
 * Informações de contato do prestador com ações de ligação e WhatsApp.
 */
interface ContactInfoProps {
    user: PrestadorResumo | null;
    onCall: (phone: string) => void;
    onWhatsApp: (phone: string) => void;
}

const ContactInfo: React.FC<ContactInfoProps> = ({ user, onCall, onWhatsApp }) => (
    <View style={styles.contactInfo}>
        {/* Linha do Telefone com ações de contato */}
        <View style={styles.phoneRow}>
            {user?.telefone ? (
                <>
                    <TouchableOpacity
                        onPress={() => onCall(user.telefone!)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ligar para ${formatPhoneForDisplay(user.telefone)}`}
                        activeOpacity={0.7}
                        style={styles.phoneAction}
                    >
                        <MaterialCommunityIcons name="phone" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    <Text variant="bodyMedium" style={styles.infoText}>
                        {formatPhoneForDisplay(user.telefone)}
                    </Text>

                    <TouchableOpacity
                        onPress={() => onWhatsApp(user.telefone!)}
                        accessibilityRole="button"
                        accessibilityLabel="Abrir conversa no WhatsApp"
                        activeOpacity={0.7}
                        style={styles.phoneAction}
                    >
                        <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <MaterialCommunityIcons name="phone-off" size={16} color={colors.textSecondary} />
                    <Text variant="bodyMedium" style={styles.infoText}>
                        Telefone não disponível
                    </Text>
                </>
            )}
        </View>

        {/* Linha da Localização (sem alteração de comportamento) */}
        <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
            <Text variant="bodyMedium" style={styles.infoText}>
                {user?.localizacao
                    ? `${user.localizacao.cidade} - ${user.localizacao.estado}`
                    : 'Localização não informada'}
            </Text>
        </View>
    </View>
);
```

---

#### 4.2.4. Simplificar o JSX principal (linhas ~113–149)

**Antes (duplicado):**
```tsx
{isPreview ? (
    <View style={styles.contactInfo}>
        <View style={styles.infoRow}>
            {/* ... telefone ... */}
        </View>
        <View style={styles.infoRow}>
            {/* ... localização ... */}
        </View>
    </View>
) : isPublicView ? (
    <View style={styles.contactInfo}>
        <View style={styles.infoRow}>
            {/* ... telefone (repetido) ... */}
        </View>
        <View style={styles.infoRow}>
            {/* ... localização (repetida) ... */}
        </View>
    </View>
) : (
    // Botão Editar
)}
```

**Depois (sem duplicação):**
```tsx
{(isPreview || isPublicView) ? (
    <ContactInfo
        user={user}
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
    />
) : (
    <Button
        mode="contained"
        onPress={() => {
            AnalyticsService.track('profile_edit_click');
            if (navigation.isReady()) {
                (navigation as any).navigate('Perfil', { screen: 'EditProfile' });
            }
        }}
    >
        Editar Perfil
    </Button>
)}
```

---

#### 4.2.5. Adicionar novos estilos (no `StyleSheet.create`)

```ts
phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
},
phoneAction: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
},
```

---

### 4.3. Testes: `packages/mobile/src/components/profile/__tests__/ProfileHeader.test.tsx`

#### 4.3.1. Adicionar mocks necessários no bloco `jest.mock('react-native', ...)`

O mock de `react-native` precisa incluir `Linking`, `Platform` e `Alert`:

```ts
return {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Appearance: { getColorScheme: () => 'light' },
    Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
    Linking: {
        openURL: jest.fn(() => Promise.resolve()),
        canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
    Alert: {
        alert: jest.fn(),
    },
};
```

#### 4.3.2. Adicionar mock para `@/utils/alert`

```ts
jest.mock('@/utils/alert', () => ({
    showAlert: jest.fn(),
}));
```

#### 4.3.3. Adicionar novos testes

```tsx
it('deve chamar Linking.openURL com tel: ao tocar no ícone de ligação (isPreview)', async () => {
    const { Linking } = require('react-native');
    let tree: any;
    act(() => {
        tree = renderer.create(
            <ProfileHeader user={mockUser} profileId={mockUser.id} isPreview={true} />
        );
    });

    // Encontrar o TouchableOpacity com accessibilityLabel de ligação
    const touchables = tree.root.findAllByType('pressable');
    const callBtn = touchables.find(
        (t: any) => t.props.accessibilityLabel?.includes('Ligar para')
    );
    expect(callBtn).toBeTruthy();

    await act(async () => {
        await callBtn.props.onPress();
    });

    expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:11987654321');
    expect(Linking.openURL).toHaveBeenCalledWith('tel:11987654321');
});

it('deve chamar Linking.openURL com wa.me ao tocar no ícone do WhatsApp (isPreview)', async () => {
    const { Linking } = require('react-native');
    let tree: any;
    act(() => {
        tree = renderer.create(
            <ProfileHeader user={mockUser} profileId={mockUser.id} isPreview={true} />
        );
    });

    const touchables = tree.root.findAllByType('pressable');
    const waBtn = touchables.find(
        (t: any) => t.props.accessibilityLabel?.includes('WhatsApp')
    );
    expect(waBtn).toBeTruthy();

    await act(async () => {
        await waBtn.props.onPress();
    });

    expect(Linking.canOpenURL).toHaveBeenCalledWith('https://wa.me/5511987654321');
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/5511987654321');
});

it('deve exibir "Telefone não disponível" quando user.telefone é undefined (isPreview)', () => {
    const userNoPhone = { ...mockUser, telefone: undefined };
    let tree: any;
    act(() => {
        tree = renderer.create(
            <ProfileHeader user={userNoPhone} profileId={userNoPhone.id} isPreview={true} />
        );
    });

    expect(findText(tree, 'Telefone não disponível')).toBe(true);
});

it('deve exibir alerta quando canOpenURL retorna false', async () => {
    const { Linking } = require('react-native');
    const { showAlert } = require('@/utils/alert');
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

    let tree: any;
    act(() => {
        tree = renderer.create(
            <ProfileHeader user={mockUser} profileId={mockUser.id} isPreview={true} />
        );
    });

    const touchables = tree.root.findAllByType('pressable');
    const callBtn = touchables.find(
        (t: any) => t.props.accessibilityLabel?.includes('Ligar para')
    );

    await act(async () => {
        await callBtn.props.onPress();
    });

    expect(showAlert).toHaveBeenCalledWith('Erro', 'Não foi possível abrir o discador neste dispositivo.');
    expect(Linking.openURL).not.toHaveBeenCalled();
});

it('deve trackear evento de analytics ao clicar em ligação', async () => {
    const { Linking } = require('react-native');
    let tree: any;
    act(() => {
        tree = renderer.create(
            <ProfileHeader user={mockUser} profileId={mockUser.id} isPreview={true} />
        );
    });

    const touchables = tree.root.findAllByType('pressable');
    const callBtn = touchables.find(
        (t: any) => t.props.accessibilityLabel?.includes('Ligar para')
    );

    await act(async () => {
        await callBtn.props.onPress();
    });

    expect(AnalyticsService.track).toHaveBeenCalledWith('profile_phone_call', { profileId: mockUser.id });
});

it('deve funcionar igualmente em isPublicView', () => {
    let tree: any;
    act(() => {
        tree = renderer.create(
            <ProfileHeader user={mockUser} profileId={mockUser.id} isPublicView={true} />
        );
    });

    // Deve exibir telefone formatado
    expect(findText(tree, '(11) 98765-4321')).toBe(true);

    // Deve ter botões de ação (ligação e WhatsApp)
    const touchables = tree.root.findAllByType('pressable');
    const callBtn = touchables.find(
        (t: any) => t.props.accessibilityLabel?.includes('Ligar para')
    );
    const waBtn = touchables.find(
        (t: any) => t.props.accessibilityLabel?.includes('WhatsApp')
    );
    expect(callBtn).toBeTruthy();
    expect(waBtn).toBeTruthy();
});
```

---

### 4.4. Testes unitários para novas funções: `packages/mobile/src/utils/__tests__/phoneFormatter.test.ts`

Criar ou atualizar o arquivo de testes do `phoneFormatter`:

```ts
import {
    removeNonNumeric,
    formatPhoneNumber,
    formatPhoneForDisplay,
    toE164Digits,
    isValidPhoneNumber,
} from '../phoneFormatter';

describe('toE164Digits', () => {
    it('deve adicionar 55 a número nacional de 11 dígitos (celular)', () => {
        expect(toE164Digits('11999887766')).toBe('5511999887766');
    });

    it('deve adicionar 55 a número nacional de 10 dígitos (fixo)', () => {
        expect(toE164Digits('1133334444')).toBe('551133334444');
    });

    it('não deve duplicar 55 se já presente (13 dígitos)', () => {
        expect(toE164Digits('5511999887766')).toBe('5511999887766');
    });

    it('não deve duplicar 55 se já presente (12 dígitos, fixo)', () => {
        expect(toE164Digits('551133334444')).toBe('551133334444');
    });

    it('deve funcionar com número formatado', () => {
        expect(toE164Digits('(11) 99988-7766')).toBe('5511999887766');
    });

    it('deve retornar dígitos como estão se tamanho inesperado', () => {
        expect(toE164Digits('123')).toBe('123');
    });
});

describe('formatPhoneForDisplay', () => {
    it('deve formatar número nacional de 11 dígitos', () => {
        expect(formatPhoneForDisplay('11999887766')).toBe('(11) 99988-7766');
    });

    it('deve remover prefixo 55 e formatar corretamente', () => {
        expect(formatPhoneForDisplay('5511999887766')).toBe('(11) 99988-7766');
    });

    it('deve funcionar com número já formatado', () => {
        expect(formatPhoneForDisplay('(11) 99988-7766')).toBe('(11) 99988-7766');
    });

    it('deve formatar fixo com prefixo 55', () => {
        expect(formatPhoneForDisplay('551133334444')).toBe('(11) 3333-4444');
    });
});
```

---

## 5. Testes Necessários

### Resumo dos cenários de teste

| Cenário | Arquivo | Status |
|---------|---------|--------|
| Toque no ícone de telefone abre o discador | `ProfileHeader.test.tsx` | 🆕 Novo |
| Toque no ícone do WhatsApp abre `wa.me` | `ProfileHeader.test.tsx` | 🆕 Novo |
| Exibe alerta se `canOpenURL` retorna `false` | `ProfileHeader.test.tsx` | 🆕 Novo |
| Telefone indisponível: exibe texto alternativo | `ProfileHeader.test.tsx` | 🆕 Novo |
| Eventos de analytics são trackeados | `ProfileHeader.test.tsx` | 🆕 Novo |
| `isPublicView` funciona igual a `isPreview` | `ProfileHeader.test.tsx` | 🆕 Novo |
| `toE164Digits` normaliza formatos variados | `phoneFormatter.test.ts` | 🆕 Novo |
| `formatPhoneForDisplay` remove `55` antes de formatar | `phoneFormatter.test.ts` | 🆕 Novo |
| Testes existentes continuam passando | `ProfileHeader.test.tsx` | ✅ Manter |

---

## 6. Checklist Final

### Antes de começar
- [ ] Ler o `ProfileHeader.tsx` atual e confirmar que as linhas estão de acordo com este doc
- [ ] Verificar se o backend retorna `telefone` com ou sem `55` (ajustar `toE164Digits` se necessário)

### Implementação
- [ ] Adicionar `toE164Digits` e `formatPhoneForDisplay` em `phoneFormatter.ts`
- [ ] Atualizar imports do `ProfileHeader.tsx` (`useCallback`, `Linking`, `TouchableOpacity`, `Platform`, novas funções)
- [ ] Adicionar `handleCall` e `handleWhatsApp` com `useCallback` no componente
- [ ] Extrair sub-componente `ContactInfo` com ícones separados de telefone e WhatsApp
- [ ] Substituir os dois blocos duplicados por `<ContactInfo />`
- [ ] Adicionar estilos `phoneRow` e `phoneAction` no `StyleSheet.create`
- [ ] Adicionar atributos de acessibilidade (`accessibilityRole`, `accessibilityLabel`)

### Testes
- [ ] Atualizar mock de `react-native` no teste para incluir `Linking`
- [ ] Adicionar mock de `@/utils/alert`
- [ ] Escrever testes para ligação, WhatsApp, telefone indisponível, erro e analytics
- [ ] Criar testes unitários para `toE164Digits` e `formatPhoneForDisplay`
- [ ] Rodar todos os testes: `pnpm --filter mobile test`

### Validação
- [ ] Testar no **Android** (ligação + WhatsApp)
- [ ] Testar no **iOS** (ligação + WhatsApp)
- [ ] Testar na **Web** (ligação abre `tel:`, WhatsApp abre nova aba)
- [ ] Testar com telefone `undefined` (exibe "Telefone não disponível")
- [ ] Testar com telefone com prefixo `55` do backend
- [ ] Testar com telefone sem prefixo `55`
- [ ] Verificar acessibilidade com leitor de tela (VoiceOver / TalkBack)

---

## Referência Visual

Layout final esperado da linha do telefone:

```
 📞  (11) 99988-7766  💬
 [call]               [whatsapp]
 📍  São Paulo - SP
```

- `📞` = Ícone `phone` do MaterialCommunityIcons (cor: `colors.primary`) — abre discador
- `💬` = Ícone `whatsapp` do MaterialCommunityIcons (cor: `#25D366`) — abre WhatsApp
- `📍` = Ícone `map-marker` (sem ação, apenas informativo)

