exports.up = (pgm) => {
  pgm.createTable('links', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },

    code: {
      type: 'varchar(10)',
      notNull: true,
    },

    short_url: {
      type: 'varchar(50)',
      notNull: true,
    },

    original_url: {
      type: 'varchar(250)',
      notNull: true,
    },

    clicks: {
      type: 'integer',
      default: 0,
    },

    expires_at: {
      type: 'timestamptz',
      default: pgm.func("timezone('utc', now())"),
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
