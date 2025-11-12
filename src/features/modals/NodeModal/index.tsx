import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea, Group } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { toast } from "react-hot-toast";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

// Update JSON at a specific path with new value
const updateJsonAtPath = (json: string, path: NodeData["path"], newValue: string) => {
  try {
    const parsedJson = JSON.parse(json);
    const parsedValue = JSON.parse(newValue);
    let current = parsedJson;

    if (!path || path.length === 0) {
      return JSON.stringify(parsedValue, null, 2);
    }

    // Navigate to the parent of the target
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    // Update the target value
    const lastKey = path[path.length - 1];
    current[lastKey] = parsedValue;

    return JSON.stringify(parsedJson, null, 2);
  } catch (error) {
    throw new Error("Invalid JSON format");
  }
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState("");
  const [originalContent, setOriginalContent] = React.useState("");

  React.useEffect(() => {
    if (nodeData) {
      const normalized = normalizeNodeData(nodeData?.text ?? []);
      setEditedContent(normalized);
      setOriginalContent(normalized);
    }
  }, [nodeData, opened]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    try {
      const currentJson = useJson.getState().getJson();
      const updatedJson = updateJsonAtPath(currentJson, nodeData?.path, editedContent);
      
      // Update the JSON in the store
      useJson.getState().setJson(updatedJson);
      
      // Update the file contents
      useFile.getState().setContents({ contents: updatedJson, hasChanges: true });
      
      // Update original content to reflect the saved state
      setOriginalContent(editedContent);
      
      toast.success("Changes saved successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    }
  };

  const handleCancel = () => {
    // Revert to the last saved state (originalContent)
    setEditedContent(originalContent);
    setIsEditing(false);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <CloseButton onClick={onClose} />
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={e => setEditedContent(e.currentTarget.value)}
                placeholder="Edit the node content..."
                minRows={4}
                style={{ fontFamily: "monospace", fontSize: "12px" }}
              />
            ) : (
              <CodeHighlight
                code={editedContent}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
        <Group justify="flex-end" gap="xs" mt="md">
          {isEditing ? (
            <>
              <Button variant="default" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>
              Edit
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
};
