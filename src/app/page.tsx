import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Shirt, Upload, Sparkles, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="space-y-12 py-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Your AI-Powered Digital Wardrobe
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Upload your clothes, organize your closet, and get personalized outfit recommendations instantly.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/upload">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/wardrobe">
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={Upload}
          title="Upload & Digitize"
          description="Snap a photo of your clothes. Our AI automatically tags color, style, and category."
          href="/upload"
        />
        <FeatureCard
          icon={Shirt}
          title="Organize Wardrobe"
          description="View your entire closet in one place. Filter by color, style, or occasion."
          href="/wardrobe"
        />
        <FeatureCard
          icon={Sparkles}
          title="Generate Outfits"
          description="Not sure what to wear? Let our AI suggest the perfect outfit for the weather."
          href="/generator"
        />
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, href }: any) {
  return (
    <Link href={href}>
      <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
        <CardHeader>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  )
}
