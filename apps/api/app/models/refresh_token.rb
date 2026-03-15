class RefreshToken < ApplicationRecord
  belongs_to :user

  validates :token, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :valid, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  TOKEN_TTL = 30.days

  def self.issue_for(user)
    raw_token = SecureRandom.hex(64)

    refresh_token = create!(
      user: user,
      token: BCrypt::Password.create(raw_token),
      expires_at: TOKEN_TTL.from_now
    )

    [ refresh_token, raw_token ]
  end

  def self.find_active_by_plaintext(raw_token)
    return if raw_token.blank?

    valid.find_each do |refresh_token|
      return refresh_token if refresh_token.matches_token?(raw_token)
    end

    nil
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  def revoked?
    revoked_at.present?
  end

  def expired?
    expires_at < Time.current
  end

  def active?
    !revoked? && !expired?
  end

  def matches_token?(raw_token)
    BCrypt::Password.new(token).is_password?(raw_token)
  rescue BCrypt::Errors::InvalidHash
    false
  end
end
