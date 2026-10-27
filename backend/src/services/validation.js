class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

function validateCustomer(customer) {
  if (!customer || typeof customer !== 'object') {
    throw new ValidationError('Customer details are required');
  }
  const name = String(customer.name || '').trim();
  const phone = String(customer.phone || '').replace(/\s+/g, '');
  const address = String(customer.address || '').trim();

  if (name.length < 2 || name.length > 80) throw new ValidationError('Please enter your name');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new ValidationError('Please enter a valid 10-digit mobile number');
  }
  if (address.length < 10 || address.length > 300) {
    throw new ValidationError('Please enter a full delivery address');
  }
  return { name, phone, address };
}

module.exports = { validateCustomer, ValidationError };
