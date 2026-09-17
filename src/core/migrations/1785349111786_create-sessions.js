exports.up = (pgm) => {
  pgm.createTable('sessions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },

    token: {
      type: 'varchar(255)',
      unique: true,
    },

    user_id: {
      type: 'uuid',
      notNull: true,
    },

    userAgent: {
      type: 'varchar(500)',
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
