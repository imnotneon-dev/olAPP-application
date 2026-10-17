import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RollUpWindow from "./RollUpWindow";
import DrillDownWindow from "./DrillDownWindow";
import SliceWindow from "./SliceWindow";
import SliceAndDiceWindow from "./SliceAndDiceWindow";
function App() {
  return (
    <div>
      <Tabs
        defaultValue="rollup"
        className="w-full h-screen overflow-y-auto flex flex-col items-center"
      >
        <TabsList variant="line" className="grid w-full grid-cols-4">
          <TabsTrigger value="rollup">Roll-Up</TabsTrigger>
          <TabsTrigger value="drilldown">Drill-Down</TabsTrigger>
          <TabsTrigger value="slice">Slice</TabsTrigger>
          <TabsTrigger value="slicendice">Slice & Dice</TabsTrigger>
        </TabsList>
        <TabsContent value="rollup">
          <RollUpWindow />
        </TabsContent>
        <TabsContent value="drilldown">
          <DrillDownWindow />
        </TabsContent>
        <TabsContent value="slice">
          <SliceWindow />
        </TabsContent>
        <TabsContent value="slicendice">
          <SliceAndDiceWindow />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
