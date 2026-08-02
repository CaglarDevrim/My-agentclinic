import { Layout } from "../components/Layout.js";
import type { StaffHeaderContext } from "../components/Header.js";
import type { PublicReview, ReviewModerationItem } from "../db/types.js";

function Rating({ value }: { value: number }) {
  return <p class="review-rating" aria-label={`Rating: ${value} out of 5`}>Rating: <strong>{value}/5</strong></p>;
}

function SubmissionTime({ value }: { value: string }) {
  const datetime = `${value.replace(" ", "T")}Z`;
  return <time datetime={datetime}>{value.replace(" ", " at ")} UTC</time>;
}

export function ReviewsPage({ reviews }: { reviews: PublicReview[] }) {
  return (
    <Layout title="Customer Reviews | AgentClinic" activePath="/reviews">
      <header class="page-heading">
        <h1>Customer Reviews</h1>
        <p>Read what restored visitors have shared about their time at AgentClinic.</p>
      </header>
      {reviews.length ? (
        <div class="review-list">
          {reviews.map((review) => (
            <article class="review-card">
              <header>
                <h2>{review.name}</h2>
                <Rating value={review.rating} />
              </header>
              <p class="review-message">{review.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <section class="review-empty">
          <h2>No published reviews yet</h2>
          <p>Our visitors are still composing their recovery notes. You can help by sharing your experience.</p>
          <p class="page-actions"><a class="button" href="/feedback">Send feedback</a></p>
        </section>
      )}
    </Layout>
  );
}

export function ReviewModerationPage({ items, staff }: { items: ReviewModerationItem[]; staff: StaffHeaderContext }) {
  return (
    <Layout title="Review moderation | AgentClinic" activePath="/dashboard" staff={staff}>
      <header class="page-heading">
        <h1>Review moderation</h1>
        <p>Approve consented feedback for publication or remove a published review.</p>
      </header>
      {items.length ? (
        <div class="moderation-list">
          {items.map((item) => {
            const published = item.approved_at !== null;
            return (
              <article class="moderation-card">
                <header class="moderation-card__header">
                  <div>
                    <h2>{item.name}</h2>
                    <p class="review-submitted">Submitted <SubmissionTime value={item.created_at} /></p>
                  </div>
                  <span class={`review-status review-status--${published ? "published" : "pending"}`}>{published ? "Published" : "Pending"}</span>
                </header>
                <Rating value={item.rating} />
                <p class="review-message">{item.message}</p>
                <form method="post" action={`/dashboard/reviews/${item.id}/${published ? "unpublish" : "approve"}`}>
                  <input type="hidden" name="_csrf" value={staff.csrfToken} />
                  <button class={`button${published ? " button--secondary" : ""}`} type="submit">
                    {published ? "Remove from reviews" : "Approve review"}
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      ) : (
        <section class="review-empty">
          <h2>No consented feedback</h2>
          <p>There is no consented feedback awaiting or receiving publication.</p>
        </section>
      )}
      <p class="page-actions"><a class="button button--secondary" href="/dashboard">Back to dashboard</a></p>
    </Layout>
  );
}
