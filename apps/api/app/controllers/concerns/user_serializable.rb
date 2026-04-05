# frozen_string_literal: true

module UserSerializable
  extend ActiveSupport::Concern

  FRIEND_FIELDS        = %i[id username].freeze
  AUTH_FIELDS          = %i[id email username role].freeze
  FRIENDSHIP_FIELDS    = %i[id email username].freeze

  private

  def serialize_user(user, fields: AUTH_FIELDS)
    user.as_json(only: fields)
  end
end
