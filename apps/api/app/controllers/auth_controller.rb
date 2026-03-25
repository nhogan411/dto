class AuthController < ApplicationController
  include JwtAuthenticatable

  before_action :authenticate_user!, only: [ :me ]

  def signup
    auth_payload = AuthService.register(signup_params)
    render json: { data: serialize_auth_payload(auth_payload) }, status: :created
  rescue AuthService::AuthError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  end

  def login
    auth_payload = AuthService.login(login_email, login_password)
    render json: { data: serialize_auth_payload(auth_payload) }
  rescue AuthService::AuthError => e
    render json: { errors: [ e.message ] }, status: :unauthorized
  end

  def refresh
    auth_payload = AuthService.refresh(refresh_token_param)
    render json: { data: serialize_auth_payload(auth_payload, include_refresh_token: false) }
  rescue AuthService::AuthError => e
    render json: { errors: [ e.message ] }, status: :unauthorized
  end

  def logout
    return render json: { errors: [ "Refresh token is required" ] }, status: :unprocessable_entity if refresh_token_param.blank?

    if AuthService.logout(refresh_token_param)
      render json: { data: { message: "Logged out successfully" } }
    else
      render json: { errors: [ "Invalid refresh token" ] }, status: :unauthorized
    end
  end

  def me
    render json: { data: serialize_user(current_user) }
  end

  private

  def signup_params
    params.require(:user).permit(:email, :username, :password)
  end

  def login_email
    params[:email] || params.dig(:user, :email)
  end

  def login_password
    params[:password] || params.dig(:user, :password)
  end

  def refresh_token_param
    params[:refresh_token]
  end

  def serialize_auth_payload(payload, include_refresh_token: true)
    data = {
      access_token: payload[:access_token],
      user: serialize_user(payload[:user])
    }
    data[:refresh_token] = payload[:refresh_token] if include_refresh_token && payload[:refresh_token].present?
    data
  end

  def serialize_user(user)
    user.as_json(only: [ :id, :email, :username, :role ])
  end
end
