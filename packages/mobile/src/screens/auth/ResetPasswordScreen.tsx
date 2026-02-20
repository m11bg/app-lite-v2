import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, TextInput, HelperText } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types';
import { authService } from '@/services/authService';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { showAlert } from '@/utils/alert';

/**
 * Propriedades para o componente ResetPasswordScreen.
 * Define os tipos para navegação e parâmetros de rota usando NativeStackScreenProps.
 */
type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

// Esquema de validação
const schema = z.object({
    token: z.string().min(6, 'Informe o token/código').trim(),
    password: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme sua nova senha'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
});

// Tipo inferido do schema (sem any)
type FormData = z.infer<typeof schema>;

/**
 * Tela de Redefinição de Senha.
 * Permite ao usuário definir uma nova senha após fornecer um token de validação enviado por e-mail.
 * 
 * @param {Props} props - Propriedades de navegação e rota fornecidas pelo React Navigation.
 * @returns {JSX.Element} Elemento JSX que renderiza a interface de redefinição de senha.
 */
const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
    const prefilledToken = route.params?.token ?? '';

    const { control, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { token: prefilledToken, password: '', confirmPassword: '' },
        mode: 'onTouched',
    });

    // Se receber token via deep link, mantém no form; usuário ainda pode editar.
    React.useEffect(() => {
        if (prefilledToken) setValue('token', prefilledToken);
    }, [prefilledToken, setValue]);

    const onSubmit = async (values: FormData) => {
        try {
            const { token, password } = values;
            await authService.resetPassword(token.trim(), password.trim());
            showAlert('Sucesso', 'Senha redefinida com sucesso.');
            navigation.replace('Login');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Não foi possível redefinir a senha.';
            showAlert('Erro', message);
        }
    };

    const showTokenInput = !prefilledToken; // sem deep link => mostra campo explicitamente

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.title}>Redefinir senha</Text>

            {showTokenInput && (
                <>
                    <Controller
                        name="token"
                        control={control}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                mode="outlined"
                                label="Token/Código (6 dígitos)"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                autoCapitalize="none"
                                keyboardType="default"
                                style={styles.input}
                            />
                        )}
                    />
                    <HelperText type="error" visible={!!errors.token}>{errors.token?.message}</HelperText>
                </>
            )}

            {!showTokenInput && (
                <>
                    <Controller
                        name="token"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                mode="outlined"
                                label="Token"
                                value={value}
                                onChangeText={onChange}
                                autoCapitalize="none"
                                style={styles.input}
                            />
                        )}
                    />
                    <HelperText type="info" visible>O token foi preenchido via link.</HelperText>
                </>
            )}

            <Controller
                name="password"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        mode="outlined"
                        label="Nova Senha"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry
                        style={styles.input}
                    />
                )}
            />
            <HelperText type="error" visible={!!errors.password}>{errors.password?.message}</HelperText>

            <Controller
                name="confirmPassword"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        mode="outlined"
                        label="Confirmar Nova Senha"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry
                        style={styles.input}
                    />
                )}
            />
            <HelperText type="error" visible={!!errors.confirmPassword}>{errors.confirmPassword?.message}</HelperText>

            <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting}>
                Redefinir senha
            </Button>
            <Button onPress={() => navigation.navigate('Login')} style={styles.link} disabled={isSubmitting}>
                Voltar ao login
            </Button>
        </View>
    );
};

/**
 * Estilos aplicados aos componentes da tela ResetPasswordScreen.
 * Define a aparência do container, títulos, campos de entrada e botões.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1, // Faz o container ocupar toda a altura e largura da tela.
        padding: 16, // Adiciona um espaçamento de 16 pixels em todas as bordas internas.
        justifyContent: 'center', // Centraliza os elementos verticalmente dentro do container.
    },
    title: {
        marginBottom: 8, // Define um espaço de 8 pixels abaixo do título.
    },
    subtitle: {
        marginBottom: 12, // Define um espaço de 12 pixels abaixo do subtítulo (e-mail).
    },
    input: {
        marginBottom: 12, // Define um espaço de 12 pixels abaixo de cada campo de texto (TextInput).
    },
    link: {
        marginTop: 8, // Define um espaço de 8 pixels acima do botão de "Voltar ao login".
    },
});

export default ResetPasswordScreen;

