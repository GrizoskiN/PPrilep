import WaterLayoutClient from "../../../../components/utility/WaterLayoutClient";
import KomunalecLayoutClient from "../../../../components/utility/KomunalecLayoutClient";
import ElectricityLayoutClient from "../../../../components/utility/ElectricityLayoutClient";

interface Props {
  children: React.ReactNode;
  params: Promise<{ provider: string }>;
}

export default async function UtilityProviderLayout({ children, params }: Props) {
  const { provider } = await params;

  if (provider === "water") {
    return <WaterLayoutClient>{children}</WaterLayoutClient>;
  }

  if (provider === "garbage") {
    return <KomunalecLayoutClient>{children}</KomunalecLayoutClient>;
  }

  if (provider === "electricity") {
    return <ElectricityLayoutClient>{children}</ElectricityLayoutClient>;
  }

  return <>{children}</>;
}
