interface ProfileHeaderProps {
  name: string | null;
  login: string;
  avatarUrl: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
}

function LineIcon({ d, label }: { d: string; label: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      className="shrink-0 text-muted"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
} as const;

export default function ProfileHeader({
  name,
  login,
  avatarUrl,
  bio,
  company,
  location,
  followers,
  following,
}: ProfileHeaderProps) {
  return (
    <section className="flex items-start gap-6 py-12">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${login}'s avatar`}
          className="h-20 w-20 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-card font-display text-3xl text-muted" aria-hidden="true">
          {login.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="font-display text-[40px] font-normal leading-tight tracking-[-0.02em] text-ink">
          {name || login}
        </h1>
        <p className="font-mono text-sm text-muted">@{login}</p>
        {bio && <p className="mt-3 max-w-2xl text-base leading-relaxed text-body">{bio}</p>}
        {(company || location) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            {company && (
              <span className="flex items-center gap-2">
                <LineIcon d={ICONS.briefcase} label="Company" />
                {company}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-2">
                <LineIcon d={ICONS.pin} label="Location" />
                {location}
              </span>
            )}
          </div>
        )}
        <p className="mt-3 font-mono text-sm text-body">
          <span className="text-ink">{followers.toLocaleString("en-US")}</span>{" "}
          <span className="text-muted">followers</span>
          <span className="mx-2 text-hairline">·</span>
          <span className="text-ink">{following.toLocaleString("en-US")}</span>{" "}
          <span className="text-muted">following</span>
        </p>
      </div>
    </section>
  );
}
