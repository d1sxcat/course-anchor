import { useRef } from 'react'
import { data, redirect, useFetcher, useFetchers } from 'react-router'
import { parseSubmission, report, useControl, isDirty } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@course-anchor/ui/components/dropdown-menu'
import { invariantResponse } from '@epic-web/invariant'
import { Laptop, Moon, Sun } from 'lucide-react'
import { ServerOnly } from 'remix-utils/server-only'
import { z } from 'zod/v4'
import { useForm, type FieldMetadata } from '~/components/form'
import { useHints, useOptionalHints } from '~/lib/client-hints'
import { useOptionalRequestInfo, useRequestInfo } from '~/lib/request-info'
import { setTheme, type Theme } from '~/lib/theme.server'
import { type Route } from './+types/theme-switch'

const ThemeFormSchema = coerceFormValue(
  z.object({
    theme: z.enum(['system', 'light', 'dark']),
    // this is useful for progressive enhancement
    redirectTo: z.string().optional(),
  })
)

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const result = ThemeFormSchema.safeParse(submission.payload)

  invariantResponse(result.success, 'Invalid theme received')

  const { theme, redirectTo } = result.data

  const responseInit = {
    headers: { 'set-cookie': setTheme(theme) },
  }
  if (redirectTo) {
    return redirect(redirectTo, responseInit)
  } else {
    return data({ result: report(submission) }, responseInit)
  }
}

function ThemeRadios({
  id,
  name,
  defaultValue,
  ['aria-describedby']: ariaDescribedBy,
}: FieldMetadata<string | null | undefined>['radioGroupProps'] &
  React.ComponentProps<typeof DropdownMenuRadioGroup>) {
  const radioGroupRef =
    useRef<React.ComponentRef<typeof DropdownMenuRadioGroup>>(null)
  const { register, change, value, blur } = useControl({
    defaultValue,
    onFocus() {
      radioGroupRef.current?.focus()
    },
  })
  return (
    <>
      <input ref={register} defaultValue={defaultValue} name={name} hidden />
      <DropdownMenuRadioGroup
        ref={radioGroupRef}
        value={value}
        onValueChange={change}
        onBlur={blur}
        id={id}
        aria-describedby={ariaDescribedBy}
      >
        <DropdownMenuRadioItem value="light"><Sun />Light</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark"><Moon />Dark</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system"><Laptop />System</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  )
}

export function ThemeDropdown({
  userPreference,
}: {
  userPreference?: Theme | null
}) {
  const fetcher = useFetcher<typeof action>()
  const requestInfo = useRequestInfo()
  const optimisticMode = useOptimisticThemeMode()
  const mode = optimisticMode ?? userPreference ?? 'system'

  const { form, fields } = useForm(ThemeFormSchema, {
    id: 'theme-radios',
    lastResult: fetcher.data?.result,
    defaultValue: {
      theme: mode,
    },
    onInput(event) {
      // we want to submit the form as soon as the user selects a theme, but we don't want to submit if the user is just navigating the radio options with their keyboard (e.g. using arrow keys)
      if (event.nativeEvent instanceof KeyboardEvent) {
        return
      }
      fetcher.submit(event.currentTarget)
    },
  })

  return (
    <fetcher.Form
      method="POST"
      {...form.props}
      action="/resources/theme-switch"
    >
      <ServerOnly>
        {() => (
          <input type="hidden" name="redirectTo" value={requestInfo.path} />
        )}
      </ServerOnly>
      <ThemeRadios {...fields.theme.radioGroupProps} />
    </fetcher.Form>
  )
}

export function ThemeSwitch({
  userPreference,
}: {
  userPreference?: Theme | null
}) {
  const fetcher = useFetcher<typeof action>()
  const requestInfo = useRequestInfo()

  const { form } = useForm(ThemeFormSchema, {
    id: 'theme-switch',
    lastResult: fetcher.data?.result,
  })

  const optimisticMode = useOptimisticThemeMode()
  const mode = optimisticMode ?? userPreference ?? 'system'
  const nextMode =
    mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
  const modeLabel = {
    light: <Sun />,
    dark: <Moon />,
    system: <Laptop />,
  }

  return (
    <fetcher.Form
      method="POST"
      {...form.props}
      action="/resources/theme-switch"
    >
      <ServerOnly>
        {() => (
          <input type="hidden" name="redirectTo" value={requestInfo.path} />
        )}
      </ServerOnly>
      <input type="hidden" name="theme" value={nextMode} />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex size-8 cursor-pointer items-center justify-center"
        >
          {modeLabel[mode]}
        </button>
      </div>
    </fetcher.Form>
  )
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
  const fetchers = useFetchers()
  const themeFetcher = fetchers.find(
    f => f.formAction === '/resources/theme-switch'
  )

  if (themeFetcher && themeFetcher.formData) {
    const submission = parseSubmission(themeFetcher.formData)
    const result = ThemeFormSchema.safeParse(submission.payload)

    if (result.success) {
      return result.data.theme
    }
  }
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
  const hints = useHints()
  const requestInfo = useRequestInfo()
  const optimisticMode = useOptimisticThemeMode()
  if (optimisticMode) {
    return optimisticMode === 'system' ? hints.theme : optimisticMode
  }
  return requestInfo.userPrefs.theme ?? hints.theme
}

export function useOptionalTheme() {
  const optionalHints = useOptionalHints()
  const optionalRequestInfo = useOptionalRequestInfo()
  const optimisticMode = useOptimisticThemeMode()
  if (optimisticMode) {
    return optimisticMode === 'system' ? optionalHints?.theme : optimisticMode
  }
  return optionalRequestInfo?.userPrefs.theme ?? optionalHints?.theme
}
