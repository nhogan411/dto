class FriendshipsController < ApplicationController
  include JwtAuthenticatable

  before_action :authenticate_user!
  before_action :set_friend_request, only: [ :accept, :decline ]

  def index
    friends = Friendship.includes(:requester, :recipient)
      .accepted
      .where("requester_id = :user_id OR recipient_id = :user_id", user_id: current_user.id)
      .map { |friendship| friend_for(friendship) }
      .uniq(&:id)

    render json: { data: friends.map { |friend| serialize_user(friend, fields: UserSerializable::FRIENDSHIP_FIELDS) } }
  end

  def search
    users = if params[:q].to_s.strip.present?
      search_users(params[:q].to_s.strip)
    else
      User.none
    end

    render json: { data: users.map { |user| serialize_user(user, fields: UserSerializable::FRIENDSHIP_FIELDS) } }
  end

  def friend_requests
    render json: {
      data: {
        sent: current_user.sent_friend_requests.pending.includes(:requester, :recipient).order(:id).map { |friendship| serialize_friend_request(friendship) },
        received: current_user.received_friend_requests.pending.includes(:requester, :recipient).order(:id).map { |friendship| serialize_friend_request(friendship) }
      }
    }
  end

  def create
    friendship = FriendshipService.send_request(current_user, params[:recipient_id])

    render json: { data: serialize_friend_request(friendship) }, status: :created
  rescue FriendshipService::ValidationError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  end

  def accept
    friendship = FriendshipService.accept(@friend_request, current_user)

    render json: { data: serialize_friend_request(friendship) }
  rescue FriendshipService::AuthorizationError => e
    render json: { errors: [ e.message ] }, status: :forbidden
  rescue FriendshipService::ValidationError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  end

  def decline
    friendship = FriendshipService.decline(@friend_request, current_user)

    render json: { data: serialize_friend_request(friendship) }
  rescue FriendshipService::AuthorizationError => e
    render json: { errors: [ e.message ] }, status: :forbidden
  rescue FriendshipService::ValidationError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  end

  private

  def set_friend_request
    @friend_request = Friendship.includes(:requester, :recipient).find_by(id: params[:id])
    return if @friend_request

    render json: { errors: [ "Friend request not found" ] }, status: :unprocessable_entity
  end

  def search_users(query)
    normalized_query = "%#{User.sanitize_sql_like(query.downcase)}%"

    User.where.not(id: excluded_user_ids)
      .where("LOWER(email) LIKE :query OR LOWER(username) LIKE :query", query: normalized_query)
      .order(:username)
  end

  def excluded_user_ids
    friendship_user_ids = Friendship.where("requester_id = :user_id OR recipient_id = :user_id", user_id: current_user.id)
      .pluck(:requester_id, :recipient_id)
      .flatten
      .uniq

    friendship_user_ids | [ current_user.id ]
  end

  def friend_for(friendship)
    friendship.requester_id == current_user.id ? friendship.recipient : friendship.requester
  end

  def serialize_friend_request(friendship)
    {
      id: friendship.id,
      status: friendship.status,
      requester: serialize_user(friendship.requester, fields: UserSerializable::FRIENDSHIP_FIELDS),
      recipient: serialize_user(friendship.recipient, fields: UserSerializable::FRIENDSHIP_FIELDS)
    }
  end
end
