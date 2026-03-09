module.exports = function (api) {
    api.cache(true);
    const isTest = process.env.JEST_WORKER_ID != null || process.env.NODE_ENV === 'test';
    const isWeb = process.env.EXPO_PUBLIC_PLATFORM === 'web';

    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Desabilita module-resolver durante testes para que o Jest's moduleNameMapper gerencie aliases
            ...(isTest ? [] : [
                [
                    'module-resolver',
                    {
                        root: ['./'],
                        alias: {
                            '@': './src'
                        },
                        extensions: ['.web.ts', '.web.tsx', '.ts', '.tsx', '.js', '.json']
                    }
                ]
            ]),
            // O plugin do Reanimated deve ser o último da lista.
            // Na web, o plugin de worklets não é necessário pois tudo roda na mesma thread JS.
            // O Reanimated 4 suporta web sem o plugin de worklets, desde que os hooks
            // recebam arrays de dependências explícitos (o que a rn-swiper-list já faz internamente).
            ...(!isTest && !isWeb ? ['react-native-reanimated/plugin'] : []),
        ]
    };
};