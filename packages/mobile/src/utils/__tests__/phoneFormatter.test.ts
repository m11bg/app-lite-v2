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
