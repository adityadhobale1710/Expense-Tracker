import Joi from 'joi';

export const verifyRegistrationOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const resendRegistrationOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});
