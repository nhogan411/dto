class AuthService
  class AuthError < StandardError; end

  def self.register(params)
    user = User.new(params)

    User.transaction do
      user.save!
      PlayerCharacter.provision_for(user)
    end

    build_auth_payload(user)
  rescue ActiveRecord::RecordInvalid => e
    raise AuthError, e.record.errors.full_messages.to_sentence
  end

  def self.login(email, password)
    user = User.find_by(email: email.to_s.downcase.strip)
    raise AuthError, "Invalid email or password" unless user&.authenticate(password)

    build_auth_payload(user)
  end

  def self.refresh(refresh_token_string)
    refresh_token = RefreshToken.find_active_by_plaintext(refresh_token_string)
    raise AuthError, "Invalid refresh token" unless refresh_token

    {
      access_token: JsonWebToken.encode(user_id: refresh_token.user_id),
      user: refresh_token.user
    }
  end

  def self.logout(refresh_token_string)
    refresh_token = RefreshToken.find_active_by_plaintext(refresh_token_string)
    return false unless refresh_token

    refresh_token.revoke!
    true
  end

  class << self
    private

    def build_auth_payload(user)
      _refresh_record, raw_refresh_token = RefreshToken.issue_for(user)

      {
        access_token: JsonWebToken.encode(user_id: user.id),
        refresh_token: raw_refresh_token,
        user: user
      }
    end
  end
end
