import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

function App() {
  const [topStories, setTopStories] = useState([])

  const getTopStories = async () => {
    const response = await fetch('http://localhost:8080/topstories/')
    const data = await response.json()
    console.log(data)
    setTopStories(data)
  }

  // Function to count stories by date
  const countStoriesByDate = (stories) => {
    const dateCounts = {}

    stories.forEach((story) => {
      const date = story.date
      if (date) {
        dateCounts[date] = (dateCounts[date] || 0) + 1
      }
    })

    // Convert to array format
    return Object.entries(dateCounts)
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  useEffect(() => {
    getTopStories()
  }, [])

  return (
    <div className="justify-center h-screen mx-auto">
      <h1>The Daily Readout</h1>

      {topStories.map((topStory) => {
        // Count stories by date for this top story
        const storyDateCounts = countStoriesByDate(
          topStory.similarStories || [],
        )
        console.log('Story date counts:', storyDateCounts)

        return (
          <div
            key={topStory.id}
            className="flex flex-row items-center gap-14 my-10"
          >
            <div className="flex-1">
              <Carousel className="">
                <CarouselContent>
                  {topStory.stories.map((story) => {
                    return (
                      <CarouselItem key={story.id}>
                        <Card>
                          <CardContent>
                            <CardTitle>
                              {story.frontpage.newspaper.name}
                            </CardTitle>
                            <CardDescription>
                              {story.frontpage.newspaper.city},{' '}
                              {story.frontpage.newspaper.state}
                            </CardDescription>
                            <div className="flex flex-row my-4">
                              <div className="w-1/2 flex items-center justify-center">
                                <img
                                  src={story.frontpage.imageMedium}
                                  alt={story.frontpage.pdf}
                                  className="max-h-72"
                                />
                              </div>
                              <div className="w-1/2 text-sm">
                                <h4>{story.headline}</h4>
                                <p className="text-md font-light text-justify">
                                  {story.summary}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <h2>{topStory.theme_headline}</h2>
              <p>{topStory.theme_summary}</p>
              <LineChart
                width={730}
                height={250}
                data={storyDateCounts}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => {
                    const dateObj = new Date(date)
                    return dateObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default App
