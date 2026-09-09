import "./badges.css";
import "./trophy-room.css";
import BadgesPageV3 from "./BadgesPageV3";

type BadgesPageProps = {
  searchParams?: Promise<{
    player?: string;
    compare?: string;
  }>;
};

export default function BadgesPage(props: BadgesPageProps) {
  return (
    <div className="hall-of-fame-vitrine">
      <BadgesPageV3 {...props} />
    </div>
  );
}
