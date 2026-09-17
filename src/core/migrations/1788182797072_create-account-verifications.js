exports.up = (pgm) => {
  pgm.createTable('account_verifications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },

    user_id: {
      type: 'uuid',
      notNull: true,
    },

    code: {
      type: 'varchar(60)',
      notNull: true,
    },

    attempts: {
      type: 'integer',
      notNull: true,
      default: 0,
    },

    used_at: {
      type: 'timestamptz',
      notNull: false,
    },

    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },

    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },

    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = false;
