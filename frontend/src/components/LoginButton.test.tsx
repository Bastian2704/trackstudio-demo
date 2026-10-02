import { useAuth0 } from '@auth0/auth0-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LoginButton from '@/components/LoginButton'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-14 (HU-03) — ts-03.06, spec frontend §4 test 1.
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

afterEach(cleanup)

describe('LoginButton', () => {
  it('al pulsar llama a loginWithRedirect', async () => {
    const loginWithRedirect = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth0).mockReturnValue(contextoAuth0({ loginWithRedirect }))

    render(<LoginButton />)
    await userEvent.click(screen.getByRole('button'))

    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
  })
})
