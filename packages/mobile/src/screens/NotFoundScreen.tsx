import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NotFound'>;

/**
 * Tela de erro 404 (Não Encontrado).
 * Exibida quando uma rota inválida é acessada via Deep Linking na Web.
 * 
 * @component
 */
const NotFoundScreen: React.FC<Props> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.title}>
                Ops! Página não encontrada.
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
                O link que você acessou pode estar quebrado ou a página foi removida.
            </Text>
            <Button 
                mode="contained" 
                onPress={() => navigation.replace('Main')}
                style={styles.button}
            >
                Voltar para o Início
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.background,
    },
    title: {
        fontWeight: 'bold',
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    subtitle: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    button: {
        minWidth: 200,
    },
});

export default NotFoundScreen;
