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
  has_many :characters, dependent: :destroy
  has_many :player_characters, class_name: "PlayerCharacter", foreign_key: :user_id, dependent: :destroy
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
end
