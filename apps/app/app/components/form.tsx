import { useMemo, useRef, type ComponentProps, type ReactNode } from 'react'
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
import { RadioGroup } from '@course-anchor/ui/components/radio-group'
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

type FormBaseProps = {
  id: string
  label: string
  children: ReactNode
  errorId: string
  errors?: string[]
  ariaInvalid?: boolean
  description?: string
  horizontal?: boolean
  controlFirst?: boolean
}

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
          'aria-invalid': metadata.ariaInvalid,
          errorId: metadata.errorId,
          errors: metadata.errors,
          ariaInvalid: metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<'input'>> &
          Partial<FormBaseProps>
      },
      get textareaProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          defaultValue: metadata.defaultValue,
          'aria-describedby': metadata.ariaDescribedBy,
          'aria-invalid': metadata.ariaInvalid,
          errorId: metadata.errorId,
          errors: metadata.errors,
          ariaInvalid: metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<'textarea'>> &
          Partial<FormBaseProps>
      },
      get checkboxProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          value: 'on',
          defaultChecked: metadata.defaultChecked,
          'aria-describedby': metadata.ariaDescribedBy,
          'aria-invalid': metadata.ariaInvalid,
          errorId: metadata.errorId,
          errors: metadata.errors,
          ariaInvalid: metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<typeof Checkbox>> &
          Partial<FormBaseProps>
      },
      get otpProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          defaultValue: metadata.defaultValue,
          'aria-describedby': metadata.ariaDescribedBy,
          'aria-invalid': metadata.ariaInvalid,
          errorId: metadata.errorId,
          errors: metadata.errors,
          ariaInvalid: metadata.ariaInvalid,
          maxLength: 6,
          pattern: REGEXP_ONLY_DIGITS_AND_CHARS,
        } satisfies Partial<React.ComponentProps<typeof InputOTP>> &
          Partial<FormBaseProps>
      },

      get radioGroupProps() {
        return {
          id: metadata.id,
          name: metadata.name,
          defaultValue: metadata.defaultValue,
          'aria-describedby': metadata.ariaDescribedBy,
					'aria-invalid': metadata.ariaInvalid,
          errorId: metadata.errorId,
          errors: metadata.errors,
          ariaInvalid: metadata.ariaInvalid,
        } satisfies Partial<React.ComponentProps<typeof RadioGroup>> &
          Partial<FormBaseProps>
      },
    }
  },
})

export const useForm = forms.useForm

function FormBase({
  id,
  errorId,
  errors,
  children,
  label,
  description,
  controlFirst,
  horizontal,
  ariaInvalid,
}: FormBaseProps) {
  const labelElement = (
    <>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
    </>
  )
  const errorElem = ariaInvalid && <FieldError id={errorId} errors={errors} />
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
  label,
  description,
  errorId,
  errors,
  ariaInvalid,
  controlFirst = false,
  horizontal = false,
  ...props
}: FieldMetadata<string | null | undefined>['inputProps'] &
  React.ComponentProps<typeof Input> &
  Omit<FormBaseProps, 'children'>) => {
  return (
    <FormBase
      label={label}
      description={description}
      errorId={errorId}
      errors={errors}
      ariaInvalid={ariaInvalid}
      controlFirst={controlFirst}
      horizontal={horizontal}
      id={props.id}
    >
      <Input {...props} key={`${props.defaultValue}-${props.name}`} />
    </FormBase>
  )
}

export const FormTextarea = ({
  label,
  description,
  errorId,
  errors,
  ariaInvalid,
  controlFirst,
  horizontal,
  ...props
}: FieldMetadata<string | null | undefined>['textareaProps'] &
  ComponentProps<typeof Textarea> &
  Omit<FormBaseProps, 'children'>) => {
  return (
    <FormBase
      label={label}
      description={description}
      errorId={errorId}
      errors={errors}
      ariaInvalid={ariaInvalid}
      controlFirst={controlFirst}
      horizontal={horizontal}
      id={props.id}
    >
      <Textarea {...props} key={`${props.defaultValue}-${props.name}`} />
    </FormBase>
  )
}

export function FormCheckbox({
  label,
  description,
  errorId,
  errors,
  ariaInvalid,
  controlFirst,
  horizontal,
  defaultChecked,
  value,
  id,
  name,
  ...props
}: FieldMetadata<boolean>['checkboxProps'] &
  ComponentProps<typeof Checkbox> &
  Omit<FormBaseProps, 'children'>) {
  const checkboxRef = useRef<React.ComponentRef<typeof Checkbox>>(null)
  const { checked, change, register, blur } = useControl({
    defaultChecked,
    value,
    onFocus() {
      checkboxRef.current?.focus()
    },
  })

  return (
    <FormBase
      label={label}
      description={description}
      errorId={errorId}
      errors={errors}
      ariaInvalid={ariaInvalid}
      controlFirst={controlFirst}
      horizontal={horizontal}
      id={id}
    >
      <input type="checkbox" ref={register} name={name} hidden />
      <Checkbox
        {...props}
        id={id}
        ref={checkboxRef}
        checked={checked}
        onCheckedChange={checked => change(checked)}
        onBlur={() => blur()}
        // className="focus:ring-stone-950 focus:ring-2 focus:ring-offset-2"
      />
    </FormBase>
  )
}

export function FormOTP({
  errorId,
  errors,
  ariaInvalid,
  defaultValue,
  pattern = REGEXP_ONLY_DIGITS_AND_CHARS,
  id,
  name,
  ...props
}: FieldMetadata<string>['otpProps'] &
  Omit<ComponentProps<typeof InputOTP>, 'children' | 'render'>) {
  const inputOTPRef = useRef<React.ComponentRef<typeof InputOTP>>(null)
  const { value, change, register } = useControl({
    defaultValue,
    onFocus() {
      inputOTPRef.current?.focus()
    },
  })

  return (
    // <FormBase {...props}>
    <>
      <input ref={register} id={id} name={name} hidden />
      <InputOTP
        ref={inputOTPRef}
        {...props}
        render={undefined}
        value={value}
        onChange={value => change(value)}
        onBlur={() => {
          // InputOTP calls the onBlur handler when the input is focused
          // Which should not happen, so we comment this out for now
          // control.blur();
        }}
        maxLength={6}
        pattern={pattern}
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
  return <FieldError id={id} errors={errors} />
}
