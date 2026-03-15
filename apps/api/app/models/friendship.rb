class Friendship < ApplicationRecord
  belongs_to :requester, class_name: "User"
  belongs_to :recipient, class_name: "User"

  enum :status, { pending: 0, accepted: 1, declined: 2 }

  validates :requester_id, uniqueness: { scope: :recipient_id, message: "friendship already exists" }
  validate :not_self_friendship
  validate :no_reverse_duplicate, on: :create

  private

  def not_self_friendship
    return unless requester_id.present? && recipient_id.present?

    errors.add(:base, "cannot friend yourself") if requester_id == recipient_id
  end

  def no_reverse_duplicate
    return unless Friendship.exists?(requester_id: recipient_id, recipient_id: requester_id)

    errors.add(:base, "friendship already exists")
  end
end
