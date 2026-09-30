import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { accountLabel, setActiveAccount, useAccountBook } from '../lib/accounts.ts'

/**
 * The phone apps keep every signed-in server one tap away. This is that list.
 * Adding one does not sign the others out.
 */
export function AccountSwitcher() {
  const book = useAccountBook()
  const queryClient = useQueryClient()
  const activeId = book.activeAccountId ?? book.accounts[0]?.id ?? null

  return (
    <div className="px-2">
      {book.accounts.length > 0 && (
        <ul className="mb-1 flex flex-col gap-0.5">
          {book.accounts.map((account) => {
            const active = account.id === activeId
            return (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAccount(account.id)
                    queryClient.clear()
                  }}
                  className={`w-full truncate rounded-lg px-3 py-1.5 text-left text-sm ${
                    active ? 'bg-sunken font-medium text-ink' : 'text-muted hover:bg-sunken/60 hover:text-ink'
                  }`}
                >
                  {accountLabel(account)}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <Link
        to="/add-account"
        className="block rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-sunken/60 hover:text-ink"
      >
        Add account
      </Link>
    </div>
  )
}
