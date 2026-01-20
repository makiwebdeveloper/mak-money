"use client";

import { useState, useEffect } from "react";
import { Database } from "@/lib/types/database";
import { buttonStyles, inputStyles } from "@/lib/styles/components";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickTransactionModal({
  isOpen,
  onClose,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [freeBalance, setFreeBalance] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      fetchFreeBalance();
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setAccountId(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchFreeBalance = async () => {
    try {
      const response = await fetch("/api/pools/balance");
      if (response.ok) {
        const data = await response.json();
        setFreeBalance(data.freeBalance);
      }
    } catch (error) {
      console.error("Error fetching free balance:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const amountValue = Number(amount);

    if (!amount || amountValue <= 0) {
      alert("Введите корректную сумму");
      return;
    }

    if (!accountId) {
      alert("Выберите счет");
      return;
    }

    // Проверка свободных средств для расхода
    if (type === "expense" && amountValue > freeBalance) {
      const shouldContinue = confirm(
        `⚠️ Недостаточно свободных средств!\n\n` +
          `Доступно: ${freeBalance.toFixed(2)}\n` +
          `Требуется: ${amountValue.toFixed(2)}\n\n` +
          `Переместите деньги из пулов в "Свободные" или продолжите на свой риск.`,
      );
      if (!shouldContinue) return;
    }

    setIsLoading(true);

    try {
      const selectedAccount = accounts.find((a) => a.id === accountId);

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: amountValue,
          currency: selectedAccount?.currency || "USD",
          account_id: accountId,
          category: category || undefined,
          description: description || undefined,
        }),
      });

      if (response.ok) {
        setAmount("");
        setCategory("");
        setDescription("");
        onClose();
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Не удалось создать транзакцию");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Быстрая транзакция
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {type === "expense" && freeBalance >= 0 && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              💰 Свободные средства: <strong>{freeBalance.toFixed(2)}</strong>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Тип транзакции */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Тип
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-lg px-4 py-2 font-medium transition ${
                  type === "income"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ✅ Доход
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-lg px-4 py-2 font-medium transition ${
                  type === "expense"
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ❌ Расход
              </button>
            </div>
          </div>

          {/* Сумма */}
          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Сумма *
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputStyles.base}
              placeholder="0.00"
              required
            />
          </div>

          {/* Счет */}
          <div>
            <label
              htmlFor="account"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Счет *
            </label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={inputStyles.base}
              required
            >
              <option value="">Выберите счет</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.balance} {account.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Категория */}
          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Категория
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputStyles.base}
              placeholder="Еда, транспорт..."
            />
          </div>

          {/* Описание */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Описание
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputStyles.base}
              placeholder="Опционально"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={buttonStyles.secondary + " flex-1"}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={buttonStyles.primary + " flex-1"}
              disabled={isLoading}
            >
              {isLoading ? "Создание..." : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
