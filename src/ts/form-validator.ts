type FieldEl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface FormValidatorConfig<
  TFields extends Record<string, FieldEl | null>,
  TRules extends Record<string, unknown> = Record<string, unknown>,
  TMessages extends Record<string, unknown> = Record<string, unknown>,
> {
  form: HTMLFormElement | null;
  submitButton: HTMLButtonElement | null;
  fields: TFields;
  formClassPrefix?: string;
  validationRules?: Partial<TRules>;
  errorMessages?: Partial<TMessages>;
}

type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
};

type DefaultValidationRules = Record<string, ValidationRule>;
type DefaultErrorMessages = Record<
  string,
  Partial<{
    required: string;
    minLength: string;
    maxLength: string;
    pattern: string;
  }>
>;

export class FormValidator {
  protected form: HTMLFormElement | null;
  protected submitButton: HTMLButtonElement | null;
  protected fields: Record<string, FieldEl | null>;
  protected formClassPrefix: string;
  protected validationRules: DefaultValidationRules;
  protected errorMessages: DefaultErrorMessages;

  constructor(config: FormValidatorConfig<Record<string, FieldEl | null>>) {
    this.form = config.form;
    this.submitButton = config.submitButton;
    this.fields = config.fields;
    this.formClassPrefix = config.formClassPrefix || 'form';
    this.validationRules = this.mergeValidationRules(config.validationRules as DefaultValidationRules | undefined);
    this.errorMessages = this.mergeErrorMessages(config.errorMessages as DefaultErrorMessages | undefined);

    this.init();
  }

  protected getDefaultValidationRules(): DefaultValidationRules {
    return {
      name: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: /^[a-zA-Z\s\u0400-\u04FF]+$/,
      },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      topic: {
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      message: {
        required: true,
        minLength: 10,
        maxLength: 500,
      },
      review: {
        required: true,
        minLength: 10,
        maxLength: 1000,
      },
    };
  }

  protected getDefaultErrorMessages(): DefaultErrorMessages {
    return {
      name: {
        required: 'Name is required',
        minLength: 'Name must be at least 2 characters long',
        maxLength: 'Name must not exceed 50 characters',
        pattern: 'Name can only contain letters and spaces',
      },
      email: {
        required: 'Email address is required',
        pattern: 'Please enter a valid email address',
      },
      topic: {
        required: 'Topic is required',
        minLength: 'Topic must be at least 3 characters long',
        maxLength: 'Topic must not exceed 100 characters',
        pattern: 'Invalid value',
      },
      message: {
        required: 'Message is required',
        minLength: 'Message must be at least 10 characters long',
        maxLength: 'Message must not exceed 500 characters',
        pattern: 'Invalid value',
      },
      review: {
        required: 'Review is required',
        minLength: 'Review must be at least 10 characters long',
        maxLength: 'Review must not exceed 1000 characters',
        pattern: 'Invalid value',
      },
    };
  }

  protected mergeValidationRules(customRules: DefaultValidationRules = {}): DefaultValidationRules {
    const defaults = this.getDefaultValidationRules();
    const merged: DefaultValidationRules = { ...defaults };

    for (const fieldName of Object.keys(customRules)) {
      merged[fieldName] = { ...merged[fieldName], ...customRules[fieldName] };
    }

    return merged;
  }

  protected mergeErrorMessages(customMessages: DefaultErrorMessages = {}): DefaultErrorMessages {
    const defaults = this.getDefaultErrorMessages();
    const merged: DefaultErrorMessages = { ...defaults };

    for (const fieldName of Object.keys(customMessages)) {
      merged[fieldName] = { ...merged[fieldName], ...customMessages[fieldName] };
    }

    return merged;
  }

  protected init() {
    if (!this.form) return;
    this.setupEventListeners();
  }

  protected setupEventListeners() {
    for (const fieldName of Object.keys(this.fields)) {
      const field = this.fields[fieldName];
      if (field) {
        field.addEventListener('blur', () => this.validateField(fieldName));
        field.addEventListener('input', () => {
          this.clearError(fieldName);
          this.validateField(fieldName);
        });
      }
    }

    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  protected getErrorElement(field: FieldEl | null, fieldName: string): HTMLElement | null {
    const specific = this.form?.querySelector<HTMLElement>(`.${this.formClassPrefix}__error--${fieldName}`) || null;
    if (specific) return specific;

    const next = field?.nextElementSibling;
    if (next instanceof HTMLElement && next.classList.contains(`${this.formClassPrefix}__error`)) {
      return next;
    }

    return this.form?.querySelector<HTMLElement>(`.${this.formClassPrefix}__error`) || null;
  }

  protected validateField(fieldName: string): boolean {
    const field = this.fields[fieldName];
    const rules = this.validationRules[fieldName];
    if (!field || !rules) return true;

    const raw = 'value' in field ? field.value : '';
    const value = (raw || '').trim();
    const errorElement = this.getErrorElement(field, fieldName);

    const show = (msg: string) => {
      if (errorElement) {
        errorElement.textContent = msg;
        errorElement.style.display = 'block';
      }
      field.classList.add(`${this.formClassPrefix}__input--error`);
    };

    const messages = this.errorMessages[fieldName];
    if (rules.required && !value) {
      show(messages?.required || 'Required');
      return false;
    }
    if (value && rules.minLength && value.length < rules.minLength) {
      show(messages?.minLength || 'Too short');
      return false;
    }
    if (value && rules.maxLength && value.length > rules.maxLength) {
      show(messages?.maxLength || 'Too long');
      return false;
    }
    if (value && rules.pattern && !rules.pattern.test(value)) {
      show(messages?.pattern || 'Invalid');
      return false;
    }

    this.clearError(fieldName);
    return true;
  }

  protected clearError(fieldName: string) {
    const field = this.fields[fieldName];
    if (!field) return;
    const errorElement = this.getErrorElement(field, fieldName);
    field.classList.remove(`${this.formClassPrefix}__input--error`);
    if (errorElement) {
      errorElement.style.display = 'none';
      errorElement.textContent = '';
    }
  }

  protected validateAllFields(): boolean {
    let isValid = true;
    for (const fieldName of Object.keys(this.fields)) {
      const fieldValid = this.validateField(fieldName);
      if (!fieldValid) isValid = false;
    }
    return isValid;
  }

  protected async handleSubmit(event: Event) {
    event.preventDefault();

    if (!this.validateAllFields()) {
      this.showSubmissionMessage('Please fix the errors above before submitting.', 'error');
      return;
    }

    this.setSubmitButtonState(true);

    try {
      const formData = this.getFormData();
      await this.submitForm(formData);
      this.showSubmissionMessage('Thank you! Your message has been sent successfully.', 'success');
      this.resetForm();
    } catch (error) {
      console.error('Form submission error:', error);
      this.showSubmissionMessage('Sorry, there was an error sending your message. Please try again.', 'error');
    } finally {
      this.setSubmitButtonState(false);
    }
  }

  protected getFormData(): Record<string, string> & { timestamp: string } {
    const data: Record<string, string> = {};
    for (const fieldName of Object.keys(this.fields)) {
      const field = this.fields[fieldName];
      const v = field && 'value' in field ? field.value : '';
      data[fieldName] = (v || '').trim();
    }
    return { ...data, timestamp: new Date().toISOString() };
  }

  protected async submitForm(formData: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Form submitted with data:', formData);
        resolve(formData);
      }, 1000);
    });
  }

  protected showSubmissionMessage(message: string, type: 'success' | 'error') {
    this.removeExistingMessage();

    const messageElement = document.createElement('div');
    messageElement.className = `${this.formClassPrefix}__message ${this.formClassPrefix}__message--${type}`;
    messageElement.textContent = message;
    messageElement.setAttribute('role', 'alert');
    messageElement.setAttribute('aria-live', 'polite');

    this.form?.insertBefore(messageElement, this.form.firstChild);

    setTimeout(() => {
      messageElement.style.opacity = '0';
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.remove();
        }
      }, 300);
    }, 5000);
  }

  protected removeExistingMessage() {
    const existingMessage = this.form?.querySelector(`.${this.formClassPrefix}__message`);
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  protected setSubmitButtonState(isLoading: boolean) {
    if (!this.submitButton) return;
    if (isLoading) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'SUBMITTING...';
      this.submitButton.classList.add(`${this.formClassPrefix}__submit--loading`);
    } else {
      this.submitButton.disabled = false;
      this.submitButton.textContent = 'SUBMIT';
      this.submitButton.classList.remove(`${this.formClassPrefix}__submit--loading`);
    }
  }

  protected resetForm() {
    this.form?.reset();
    for (const fieldName of Object.keys(this.fields)) {
      this.clearError(fieldName);
    }
  }
}

