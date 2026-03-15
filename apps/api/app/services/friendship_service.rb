class FriendshipService
  class Error < StandardError; end
  class ValidationError < Error; end
  class AuthorizationError < Error; end

  class << self
    def send_request(requester, recipient_id)
      recipient = User.find_by(id: recipient_id)
      raise ValidationError, "Recipient not found" unless recipient
      raise ValidationError, "cannot friend yourself" if requester.id == recipient.id

      direct_friendship = Friendship.find_by(requester: requester, recipient: recipient)
      raise ValidationError, "friendship already exists" if direct_friendship.present?

      reverse_friendship = Friendship.find_by(requester: recipient, recipient: requester)
      return accept(reverse_friendship, requester) if reverse_friendship&.pending?
      raise ValidationError, "friendship already exists" if reverse_friendship.present?

      friendship = Friendship.create!(requester: requester, recipient: recipient, status: :pending)
      broadcast_request_received(friendship)
      friendship
    rescue ActiveRecord::RecordInvalid => e
      raise ValidationError, e.record.errors.full_messages.to_sentence
    end

    def accept(friendship, current_user)
      authorize_recipient!(friendship, current_user)
      validate_pending!(friendship)

      friendship.update!(status: :accepted)
      friendship
    rescue ActiveRecord::RecordInvalid => e
      raise ValidationError, e.record.errors.full_messages.to_sentence
    end

    def decline(friendship, current_user)
      authorize_recipient!(friendship, current_user)
      validate_pending!(friendship)

      friendship.update!(status: :declined)
      friendship
    rescue ActiveRecord::RecordInvalid => e
      raise ValidationError, e.record.errors.full_messages.to_sentence
    end

    private

    def authorize_recipient!(friendship, current_user)
      raise AuthorizationError, "Forbidden" unless friendship.recipient_id == current_user.id
    end

    def validate_pending!(friendship)
      raise ValidationError, "Friend request is not pending" unless friendship.pending?
    end

    def broadcast_request_received(friendship)
      NotificationChannel.broadcast_to(
        friendship.recipient,
        {
          event: "friend_request_received",
          friendship_id: friendship.id,
          requester_id: friendship.requester_id,
          recipient_id: friendship.recipient_id,
          status: friendship.status
        }
      )
    rescue NameError
      nil
    end
  end
end
