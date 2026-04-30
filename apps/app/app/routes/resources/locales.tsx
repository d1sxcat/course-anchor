import { useRef } from 'react'
import { data, useFetcher } from 'react-router'
import { parseSubmission, report, useControl } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@course-anchor/ui/components/dropdown-menu'
import { ServerOnly } from 'remix-utils/server-only'
import { z } from 'zod'
import { useForm, type FieldMetadata } from '~/components/form'
import { getUserId } from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { useRequestInfo } from '~/lib/request-info'
import { createToastHeaders } from '~/lib/toast.server'
import resources from '~/locales'
import { combineHeaders } from '../../lib/misc'
import { localeCookie } from '../../middleware/i18next'
import type { Route } from './+types/locales'

const LanguageSchema = coerceFormValue(
  z.object({
    lng: z.enum(Object.keys(resources) as Array<keyof typeof resources>),
    redirectTo: z.string().optional(),
  })
)

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request)
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const result = LanguageSchema.safeParse(submission.payload)

  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      {
        status: 500,
      }
    )
  }

  const { lng } = result.data

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { locale: lng },
    })
  }

  return data(
    { result: report(submission) },
    {
      headers: combineHeaders(
        await createToastHeaders({
          title: 'Language updated',
          type: 'success',
          description: 'Your language preference has been updated.',
        }),
        { 'Set-Cookie': await localeCookie.serialize(lng) }
      ),
    }
  )
}

function LanguageRadios({
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

  const languageNames = new Intl.DisplayNames([value ?? defaultValue], {
    type: 'language',
  })
  return (
    <>
      <input ref={register} defaultValue={defaultValue} name={name} hidden />
      <DropdownMenuRadioGroup
        ref={radioGroupRef}
        value={value ?? undefined}
        onValueChange={change}
        onBlur={blur}
        id={id}
        aria-describedby={ariaDescribedBy}
      >
        {Object.keys(resources).map(lng => (
          <DropdownMenuRadioItem key={lng} value={lng}>
            {languageNames.of(lng)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}

export function LanguageDropdown({
  userPreference,
}: {
  userPreference?: string | null
}) {
  const fetcher = useFetcher<typeof action>()
  const requestInfo = useRequestInfo()
  const { form, fields } = useForm(LanguageSchema, {
    id: 'language-switch-radios',
    lastResult: fetcher.data?.result,
    defaultValue: {
      lng: userPreference,
    },
    onInput(event) {
      // we want to submit the form as soon as the user selects a language, but we don't want to submit if the user is just navigating the radio options with their keyboard (e.g. using arrow keys)
      if (event.nativeEvent instanceof KeyboardEvent) {
        return
      }
      fetcher.submit(event.currentTarget)
    },
  })
  return (
    <fetcher.Form method="POST" {...form.props} action="/resources/locales">
      <ServerOnly>
        {() => (
          <input type="hidden" name="redirectTo" value={requestInfo.path} />
        )}
      </ServerOnly>
      <LanguageRadios {...fields.lng.radioGroupProps} />
    </fetcher.Form>
  )
}
