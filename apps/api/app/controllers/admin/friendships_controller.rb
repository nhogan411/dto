module Admin
  class FriendshipsController < Admin::BaseController
    def index
      scope = Friendship.includes(:requester, :recipient).all

      # Optional filter: ?user_id=<id> (finds friendships where user is requester OR recipient)
      if params[:user_id].present?
        uid = params[:user_id]
        scope = scope.where(requester_id: uid).or(Friendship.where(recipient_id: uid))
      end

      friendships = scope.order(:id)

      render json: { data: friendships.map { |f| serialize_friendship(f) } }
    end

    def show
      friendship = Friendship.includes(:requester, :recipient).find_by(id: params[:id])

      unless friendship
        render json: { errors: [ "Not found" ] }, status: :not_found
        return
      end

      render json: { data: serialize_friendship(friendship) }
    end

    private

    def serialize_friendship(friendship)
      {
        id: friendship.id,
        requester_id: friendship.requester_id,
        recipient_id: friendship.recipient_id,
        status: friendship.status,
        created_at: friendship.created_at,
        requester: serialize_user(friendship.requester),
        recipient: serialize_user(friendship.recipient)
      }
    end

    def serialize_user(user)
      {
        id: user.id,
        username: user.username
      }
    end
  end
end
