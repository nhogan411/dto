class User < ApplicationRecord
  has_secure_password

  before_save { self.email = email.downcase.strip if email.present? }

  has_many :refresh_tokens, dependent: :destroy
  has_many :sent_friend_requests,
           class_name: "Friendship",
           foreign_key: :requester_id,
           inverse_of: :requester,
           dependent: :destroy
  has_many :received_friend_requests,
           class_name: "Friendship",
           foreign_key: :recipient_id,
           inverse_of: :recipient,
           dependent: :destroy
  has_many :game_characters, dependent: :destroy
  has_many :player_characters, class_name: "PlayerCharacter", foreign_key: :user_id, dependent: :destroy
  has_many :games_as_challenger,
           class_name: "Game",
           foreign_key: :challenger_id,
           inverse_of: :challenger,
           dependent: :nullify
  has_many :games_as_challenged,
           class_name: "Game",
           foreign_key: :challenged_id,
           inverse_of: :challenged,
           dependent: :nullify
  has_many :notifications, dependent: :destroy

  validates :email,
             presence: true,
             uniqueness: { case_sensitive: false },
             format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password,
            length: { minimum: 8 },
            allow_nil: true
  validates :username,
              presence: true,
              uniqueness: { case_sensitive: false },
              length: { minimum: 3, maximum: 30 },
              format: { with: /\A[a-zA-Z0-9_]+\z/, message: "only letters, numbers, underscores" }

  # FROZEN: never reorder values. Append new roles only.
  enum :role, { player: 0, admin: 1 }, default: :player
end
