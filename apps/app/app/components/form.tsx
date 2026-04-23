import { useMemo, useRef, type ReactNode } from 'react'
import {
  configureForms,
  useControl,
  type FieldMetadata as BaseFieldMetadata,
  type Fieldset as BaseFieldset,
  type FormMetadata as BaseFormMetadata,
  type InferBaseErrorShape,
  type InferCustomFieldMetadata,
  type InferCustomFormMetadata,
} from '@conform-to/react/future'
import { getConstraints } from '@conform-to/zod/v4/future'
import { Checkbox } from '@course-anchor/ui/components/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@course-anchor/ui/components/field'
import { Input } from '@course-anchor/ui/components/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@course-anchor/ui/components/input-otp'
import { Textarea } from '@course-anchor/ui/components/textarea'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'

type BaseErrorShape = InferBaseErrorShape<typeof forms.config>
type CustomFormMetadata = InferCustomFormMetadata<typeof forms.config>
type CustomFieldMetadata = InferCustomFieldMetadata<typeof forms.config>

export type FormMetadata<ErrorShape extends BaseErrorShape = BaseErrorShape> =
  BaseFormMetadata<ErrorShape, CustomFormMetadata, CustomFieldMetadata>

export type FieldMetadata<
  FieldShape,
  ErrorShape extends BaseErrorShape = BaseErrorShape,
> = BaseFieldMetadata<FieldShape, ErrorShape, CustomFieldMetadata>

export type Fieldset<
  FieldShape,
  ErrorShape extends BaseErrorShape = BaseErrorShape,
> = BaseFieldset<FieldShape, ErrorShape, CustomFieldMetadata>

type FormBaseProps<FieldShape extends unknown = unknown> = {
  label: ReactNode
  children: ReactNode
  description?: ReactNode
  horizontal?: boolean
  controlFirst?: boolean
  placeholder?: string
} & BaseFieldMetadata<FieldShape>

const forms = configureForms({
  getConstraints,
  shouldValidate: 'onBlur',
  shouldRevalidate: 'onInput',
  extendFieldMetadata(metadata) {
    return {
      get inputProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          defaultValue: metadata.defaultValue,
          'aria-describedby': metadata.ariaDescribedBy,
          required: metadata.required,
          'aria-invalid': metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<'input'>>
      },
      get textareaProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          defaultValue: metadata.defaultValue,
          'aria-describedby': metadata.ariaDescribedBy,
          required: metadata.required,
          'aria-invalid': metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<'textarea'>>
      },
      get checkboxProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          value: 'on',
          defaultChecked: metadata.defaultChecked,
          'aria-describedby': metadata.ariaDescribedBy,
          'aria-invalid': metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<typeof Checkbox>>
      },
      get otpProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          defaultValue: metadata.defaultValue,
          'aria-describedby': metadata.ariaDescribedBy,
          required: metadata.required,
          'aria-invalid': metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<typeof InputOTP>>
      },
    }
  },
})

export const useForm = forms.useForm

function FormBase<FieldShape extends unknown = unknown>({
  children,
  label,
  description,
  controlFirst,
  horizontal,
  errorId,
  errors,
  ariaInvalid,
  id,
}: FormBaseProps<FieldShape>) {
  const labelElement = (
    <>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
    </>
  )
  const errorElem = ariaInvalid && (
    <FieldError id={errorId}>{errors}</FieldError>
  )
  return (
    <Field
      data-invalid={ariaInvalid}
      orientation={horizontal ? 'horizontal' : undefined}
    >
      {controlFirst ? (
        <>
          {children}
          <FieldContent>
            {labelElement}
            {errorElem}
          </FieldContent>
        </>
      ) : (
        <>
          <FieldContent>{labelElement}</FieldContent>
          {children}
          {errorElem}
        </>
      )}
    </Field>
  )
}

export const FormInput = ({
  inputProps,
  placeholder,
  type = 'text',
  autoComplete,
  ...props
}: FieldMetadata<string> &
  Omit<FormBaseProps<string>, 'children'> & {
    type?: 'text' | 'email' | 'password'
    autoComplete?: React.HTMLInputAutoCompleteAttribute
  }) => {
  return (
    <FormBase {...props}>
      <Input
        {...inputProps}
        autoComplete={autoComplete}
        placeholder={placeholder}
        type={type}
      />
    </FormBase>
  )
}

export const FormTextarea = ({
  textareaProps,
  placeholder,
  ...props
}: FieldMetadata<string> & Omit<FormBaseProps<string>, 'children'>) => {
  return (
    <FormBase {...props}>
      <Textarea
        {...textareaProps}
        placeholder={placeholder}
        className="resize-none"
      />
    </FormBase>
  )
}

export function FormCheckbox({
  checkboxProps,
  ...props
}: FieldMetadata<boolean> & Omit<FormBaseProps<boolean>, 'children'>) {
  const checkboxRef = useRef<React.ComponentRef<typeof Checkbox>>(null)
  const { checked, change, register, blur } = useControl({
    defaultChecked: checkboxProps.defaultChecked,
    value: checkboxProps.value,
    onFocus() {
      checkboxRef.current?.focus()
    },
  })

  return (
    <FormBase {...props}>
      <input
        type="checkbox"
        ref={register}
        id={checkboxProps.id}
        name={checkboxProps.name}
        hidden
      />
      <Checkbox
        ref={checkboxRef}
        checked={checked}
        onCheckedChange={checked => change(checked)}
        onBlur={() => blur()}
        className="focus:ring-stone-950 focus:ring-2 focus:ring-offset-2"
      />
    </FormBase>
  )
}

export function FormOTP({
  otpProps,
  errorId,
  errors,
  ariaInvalid,
  pattern = REGEXP_ONLY_DIGITS_AND_CHARS,
}: FieldMetadata<string> &
  Omit<FormBaseProps<string>, 'children'> & {
    length?: number
  }) {
  const inputOTPRef = useRef<React.ComponentRef<typeof InputOTP>>(null)
  const { value, change, register, blur } = useControl({
    defaultValue: otpProps.defaultValue,
    onFocus() {
      inputOTPRef.current?.focus()
    },
  })

  return (
    // <FormBase {...props}>
    <>
      <input ref={register} id={otpProps.id} name={otpProps.name} hidden />
      <InputOTP
        ref={inputOTPRef}
        value={value}
        onChange={value => change(value)}
        onBlur={() => {
          // InputOTP calls the onBlur handler when the input is focused
          // Which should not happen, so we comment this out for now
          // control.blur();
        }}
        maxLength={6}
        pattern={pattern}
        aria-describedby={otpProps['aria-describedby']}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      {ariaInvalid && <FormErrors errors={errors} id={errorId} />}
      {/* </FormBase> */}
    </>
  )
}

export function FormErrors({ errors, id }: { errors?: string[]; id: string }) {
  const formattedErrors = useMemo(
    () => errors?.map(error => ({ message: error })) || [],
    [errors]
  )
  return <FieldError id={id} errors={formattedErrors} />
}
