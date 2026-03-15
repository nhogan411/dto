class JsonWebToken
  ACCESS_TOKEN_TTL = 15.minutes

  class << self
    def encode(payload = nil, exp: ACCESS_TOKEN_TTL.from_now, **claims)
      token_payload = (payload || {}).to_h.merge(claims)
      JWT.encode(token_payload.merge(exp: exp.to_i), secret)
    end

    def decode(token)
      body = JWT.decode(token, secret, true, algorithm: "HS256")[0]
      body.with_indifferent_access
    rescue JWT::DecodeError, JWT::ExpiredSignature
      nil
    end

    private

    def secret
      Rails.application.credentials.jwt_secret || "dev_secret_change_in_production"
    end
  end
end
