import { FormValidator } from './form-validator.js';

export class ContactFormValidator extends FormValidator {
  constructor() {
    const config = {
      form: document.querySelector<HTMLFormElement>('.contact-form__form'),
      submitButton: document.querySelector<HTMLButtonElement>('.contact-form__submit'),
      fields: {
        name: document.getElementById('name') as HTMLInputElement | null,
        email: document.getElementById('email') as HTMLInputElement | null,
        topic: document.getElementById('topic') as HTMLInputElement | null,
        message: document.getElementById('message') as HTMLTextAreaElement | null,
      },
      formClassPrefix: 'contact-form',
    };

    super(config);
  }

  protected setSubmitButtonState(isLoading: boolean) {
    if (!this.submitButton) return;
    if (isLoading) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'SENDING...';
      this.submitButton.classList.add('contact-form__submit--loading');
    } else {
      this.submitButton.disabled = false;
      this.submitButton.textContent = 'SEND';
      this.submitButton.classList.remove('contact-form__submit--loading');
    }
  }
}

