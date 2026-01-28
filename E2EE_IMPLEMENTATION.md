# Реализация End-to-End шифрования - Инструкция по завершению

## ✅ Завершенные этапы (1-5)

### 1. Криптографический сервис ✓

- Создан `encryption-service.ts` с AES-GCM 256-bit шифрованием
- Использует Web Crypto API для безопасности
- Функции: генерация ключей, шифрование, дешифрование

### 2. Управление ключами ✓

- Создан `key-management-service.ts`
- Хранение в IndexedDB (только в браузере пользователя)
- Функции экспорта/импорта, recovery phrase

### 3. Миграция БД ✓

- Создана `011_add_encryption_support.sql`
- Добавлены поля `encrypted_data` (JSONB) во все таблицы
- Старые поля сделаны nullable для обратной совместимости

### 4. TypeScript типы ✓

- Обновлен `database.ts` с типами для зашифрованных данных
- Добавлены интерфейсы: `DecryptedAccount`, `DecryptedTransaction` и др.
- Типы `EncryptedData` для всех сущностей

### 5. React хуки ✓

- Создан `useEncryption.ts` с хуками для всех типов данных
- `useAccountEncryption`, `useTransactionEncryption`, etc.
- Автоматическое кеширование и управление состоянием

## 📋 Оставшиеся этапы (6-10)

### 6. Обновление API Routes

**Файлы для модификации:**

- `src/app/api/accounts/route.ts`
- `src/app/api/accounts/[id]/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/app/api/pools/route.ts`
- `src/app/api/pools/[id]/route.ts`
- `src/app/api/allocations/route.ts`
- `src/app/api/allocations/[id]/route.ts`

**Принципы изменений:**

```typescript
// БЫЛО (пример для POST /api/accounts):
const { name, type, currency, balance } = await req.json();
const { data, error } = await supabase
  .from('accounts')
  .insert({ name, type, currency, balance, user_id })
  .select()
  .single();

// СТАЛО:
const { encrypted_data, type, currency } = await req.json();
// encrypted_data уже зашифровано клиентом
const { data, error } = await supabase
  .from('accounts')
  .insert({
    encrypted_data, // просто сохраняем как есть
    type,
    currency,
    user_id,
    // name и balance теперь null, данные в encrypted_data
  })
  .select()
  .single();
```

**Важно:** Сервер НЕ расшифровывает данные, только передает их как есть.

### 7. Обновление клиентских компонентов

**Файлы для модификации:**

- `src/app/accounts/accounts-client.tsx`
- `src/app/transactions/transactions-client.tsx`
- `src/app/pools/pools-client.tsx`
- `src/components/allocation-manager.tsx`
- `src/components/quick-transaction-modal.tsx`

**Пример для accounts-client.tsx:**

```typescript
'use client';
import { useAccountEncryption } from '@/lib/hooks/useEncryption';

export default function AccountsClient() {
  const { data, isLoading } = useAccounts();
  const { encryptAccount, decryptAccountRow } = useAccountEncryption();

  // При создании счета:
  const handleCreate = async (name: string, balance: number) => {
    const encrypted_data = await encryptAccount(name, balance);

    await fetch('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({
        encrypted_data,
        type: 'bank',
        currency: 'USD',
      }),
    });
  };

  // При отображении:
  const decryptedAccounts = await Promise.all(
    data?.map(row => decryptAccountRow(row)) || []
  );

  return (
    // Отображаем decryptedAccounts
  );
}
```

### 8. Инициализация ключа при онбординге

**Файл:** `src/app/onboarding/page.tsx`

**Добавить:**

```typescript
'use client';
import { initializeUserKey, getRecoveryPhrase } from '@/lib/services/key-management-service';
import { useState } from 'react';

export default function OnboardingPage() {
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>('');
  const [step, setStep] = useState<'init' | 'backup' | 'complete'>('init');

  const handleInitialize = async () => {
    // Генерируем ключ
    await initializeUserKey();

    // Получаем recovery phrase для backup
    const phrase = await getRecoveryPhrase();
    setRecoveryPhrase(phrase);
    setStep('backup');
  };

  return (
    <div>
      {step === 'init' && (
        <div>
          <h1>Защита ваших данных</h1>
          <p>🔐 Ваши данные будут защищены сквозным шифрованием</p>
          <p>✅ Только вы сможете видеть свои финансы</p>
          <p>❌ Сервис НЕ имеет доступа к вашим данным</p>
          <button onClick={handleInitialize}>Создать ключ шифрования</button>
        </div>
      )}

      {step === 'backup' && (
        <div>
          <h1>⚠️ Сохраните ключ восстановления</h1>
          <p>Это единственная копия! Потеря ключа = потеря данных.</p>
          <div style={{ background: '#f0f0f0', padding: '20px', fontFamily: 'monospace' }}>
            {recoveryPhrase}
          </div>
          <button onClick={() => navigator.clipboard.writeText(recoveryPhrase)}>
            Копировать
          </button>
          <button onClick={() => setStep('complete')}>
            Я сохранил ключ
          </button>
        </div>
      )}

      {step === 'complete' && (
        // Продолжить с выбором валюты и т.д.
      )}
    </div>
  );
}
```

### 9. UI для управления ключами

**Создать:** `src/app/settings/encryption/page.tsx`

**Функционал:**

- Экспорт ключа (показать recovery phrase)
- Импорт ключа (для восстановления на новом устройстве)
- Предупреждения о безопасности
- Кнопка "Удалить ключ" (с подтверждением)

**Пример:**

```typescript
'use client';
import { useState } from 'react';
import { getRecoveryPhrase, importUserKey, deleteUserKey } from '@/lib/services/key-management-service';

export default function EncryptionSettings() {
  const [phrase, setPhrase] = useState('');
  const [showPhrase, setShowPhrase] = useState(false);

  const handleExport = async () => {
    const p = await getRecoveryPhrase();
    setPhrase(p);
    setShowPhrase(true);
  };

  const handleImport = async (importedPhrase: string) => {
    try {
      await importUserKey(importedPhrase);
      alert('Ключ успешно восстановлен!');
    } catch (error) {
      alert('Неверный формат ключа');
    }
  };

  return (
    <div>
      <h1>Управление шифрованием</h1>

      <section>
        <h2>Экспорт ключа</h2>
        <button onClick={handleExport}>Показать ключ восстановления</button>
        {showPhrase && <pre>{phrase}</pre>}
      </section>

      <section>
        <h2>Импорт ключа</h2>
        <textarea
          placeholder="Вставьте ключ восстановления"
          onChange={(e) => handleImport(e.target.value)}
        />
      </section>

      <section>
        <h2>⚠️ Опасная зона</h2>
        <button onClick={async () => {
          if (confirm('Удалить ключ? Все данные станут недоступны!')) {
            await deleteUserKey();
          }
        }}>
          Удалить ключ
        </button>
      </section>
    </div>
  );
}
```

### 10. Обновление home-view

**Файл:** `src/components/home-view.tsx`

**Изменения:**

```typescript
'use client';
import { useAccountEncryption } from '@/lib/hooks/useEncryption';
import { useAccounts } from '@/lib/hooks/useAccounts';

export default function HomeView() {
  const { data: accounts } = useAccounts();
  const { decryptAccountRow } = useAccountEncryption();
  const [decryptedAccounts, setDecryptedAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const decrypt = async () => {
      if (!accounts) return;

      // Расшифровываем все счета
      const decrypted = await Promise.all(
        accounts.map(acc => decryptAccountRow(acc))
      );

      setDecryptedAccounts(decrypted.filter(Boolean));

      // Считаем баланс НА КЛИЕНТЕ
      const total = decrypted.reduce((sum, acc) => {
        if (!acc) return sum;
        return sum + acc.balance;
      }, 0);

      setTotalBalance(total);
    };

    decrypt();
  }, [accounts]);

  return (
    <div>
      <h1>Общий баланс: {totalBalance}</h1>
      {decryptedAccounts.map(acc => (
        <div key={acc.id}>
          {acc.name}: {acc.balance} {acc.currency}
        </div>
      ))}
    </div>
  );
}
```

## 🚀 Следующие шаги

1. **Запустите миграцию БД:**

   ```bash
   # В вашем Supabase проекте запустите:
   # supabase/migrations/011_add_encryption_support.sql
   ```

2. **Обновите API routes** (этап 6) - начните с одного endpoint для проверки

3. **Обновите один клиентский компонент** (этап 7) для тестирования

4. **Добавьте онбординг** (этап 8)

5. **Создайте страницу настроек** (этап 9)

6. **Обновите home-view** (этап 10)

7. **Тестирование:**
   - Создайте нового пользователя
   - Проверьте, что данные шифруются
   - Проверьте в Supabase, что поле `encrypted_data` содержит зашифрованные данные
   - Проверьте восстановление ключа

## ⚠️ Важные замечания

### Безопасность:

- **Никогда** не отправляйте расшифрованный ключ на сервер
- **Никогда** не расшифровывайте данные на сервере
- **Всегда** предупреждайте пользователя о важности backup ключа

### Обратная совместимость:

- Старые записи (без `encrypted_data`) должны обрабатываться отдельно
- Можно добавить флаг миграции для постепенного перехода
- Рассмотрите создание скрипта миграции существующих данных

### Производительность:

- Расшифровка происходит на клиенте - учитывайте это
- Кешируйте расшифрованные данные в памяти
- Используйте Web Workers для больших объемов данных

### UX:

- Показывайте loading при расшифровке
- Ясно объясняйте пользователю принципы E2EE
- Предупреждайте о невозможности восстановления без ключа

## 📚 Дополнительные улучшения (опционально)

1. **Шифрование на основе пароля:**
   - Использовать PBKDF2 для деривации ключа из пароля пользователя
   - Хранить соль в Supabase

2. **Несколько устройств:**
   - Синхронизация ключа через зашифрованное облако
   - QR-код для передачи между устройствами

3. **Биометрия:**
   - WebAuthn для защиты ключа
   - Face ID / Touch ID на поддерживаемых устройствах

4. **Аудит безопасности:**
   - Логирование попыток доступа к ключу
   - Уведомления о новых устройствах

5. **Offline support:**
   - Service Worker для кеширования
   - IndexedDB для локального хранения зашифрованных данных
