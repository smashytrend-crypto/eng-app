import { Card, Muted, Screen } from '../components/ui'

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen title={title}>
      <Card>
        <Muted>Ten ekran pojawi się w kolejnej wersji aplikacji.</Muted>
      </Card>
    </Screen>
  )
}
