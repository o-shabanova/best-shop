import { FormValidator } from './form-validator.js';

export class ContactFormValidator extends FormValidator {
  constructor() {
    const config = {
      form: document.querySelector<HTMLFormElement>('.contact-form__form'),
      submitButton: document.querySelector<HTMLButtonElement>('.contact-form__submit'),
      fields: {
        name: document.querySelector<HTMLInputElement>('#name'),
        email: document.querySelector<HTMLInputElement>('#email'),
        topic: document.querySelector<HTMLInputElement>('#topic'),
        message: document.querySelector<HTMLTextAreaElement>('#message'),
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

